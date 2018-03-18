const libPath = require('path');
const libFs = require('fs');

const errno = require('enumconsts').errno;
const lodash = require('lodash');
const libYaml = require('js-yaml');
const commander = require('commander');

const {LOGGER_LEVEL_VALUES} = require('./lib/logger');
const {APP_COMMANDS} = require('./entities/consts');
const {DEFAULT_PORT} = require('./lib/server');

const BASE_NAME = 'settings';
const ROOT_PATH = libPath.resolve(__dirname, '../');

function loadSettingsFromFileSync(target, filename, mandatory = true) {
	const path = libPath.resolve(ROOT_PATH, filename);
	
	try {
		const fileContent = libFs.readFileSync(path, 'utf8');
		const doc = libYaml.safeLoad(fileContent);
		lodash.merge(target, doc);
		return target;
	}
	catch (err) {
		if (err.code === errno.ENOENT) {
			// Missing settings file
			
			if (!mandatory) {
				// This is ok, it's an optional file
				return target;
			}
			
			throw new Error(`Required settings file "${filename}" not found at ${ROOT_PATH}`);
		}
		
		// Some other error, maybe incorrect format. This should crash the app
		throw err;
	}
}

/**
 * Load settings from argv (command line arguments)
 * @param {AppSettings} target
 * @param {Environment} env
 */
function loadSettingsFromCommandLine(target, env) {
	let command = null;
	const args = commander
		.version(env.version)
		.description(env.description)
		
		.option('--indexes', 'Ensure indexes for all models and exit')
		
		.option('--repl', 'Start a REPL environment')
		
		.option(
			'--add-user <username>,<password>',
			`Register a new user. Provide username and password separated by ","`,
			(val) => {
				const parts = val.split(',');
				return {
					username: parts[0],
					password: parts[1]
				};
			}
		)
		
		.option('-v, --verbose',
			'Increase logger verbosity (from INFO to VERBOSE to DEBUG)',
			(_, total) => total + 1,
			0
		)
		
		.option('-q, --quiet',
			'Decrease logger verbosity (from INFO to WARNING to ERROR)',
			(_, total) => total - 1,
			0
		)
		
		.option('-p, --port <port>', `Set API port (defaults to ${DEFAULT_PORT})`)

		.parse(env.argv);
	
	if (args.repl) {
		target.command = APP_COMMANDS.repl;
	}
	else if (args.indexes) {
		target.command = APP_COMMANDS.indexes;
	}
	else if (args.addUser) {
		target.command = APP_COMMANDS.add_user;
		target.add_user = args.addUser;
	}
	
	if (args.verbose !== 0 || args.quiet !== 0) {
		// Load logger verbosity from command line. This will be built upon any value from settings.
		target.Logger = target.Logger || {};
		const baseLevel = target.Logger.level || LOGGER_LEVEL_VALUES.info;
		target.Logger.level = baseLevel + (args.verbose || 0) - (args.quiet || 0);
	}
	
	if (args.port) {
		target.Server = target.Server || {};
		target.Server.port = Number(args.port) || DEFAULT_PORT;
	}
	
	return target;
}

/**
 * Load settings from multiple source files.
 * @param {Environment} env Environment to load the settings from.
 * @returns {AppSettings}
 */
function loadSettingsSync(env) {
	
	// Settings will be loaded here. Each successive call will mutate this object in sequence, overwriting previous
	// values. So, the settings sources must be arranged by priority, from lowest to highest (CLI).
	const settings = {};
	
	// Load base settings, eg. settings.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.yaml');
	
	// Load local settings, eg. settings.local.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.local.yaml', false);
	
	// Load environment based settings, eg. settings.production.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.' + env.node_env + '.yaml', false);

	// Load environment-based local settings, eg. settings.test.local.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.' + env.node_env + '.local.yaml', false);
	
	// Load settings from argv
	loadSettingsFromCommandLine(settings, env);
	
	return settings;
}

module.exports = {
	loadSettingsSync
};