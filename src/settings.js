const libPath = require('path');
const libFs = require('fs');

const errno = require('enumconsts').errno;
const lodash = require('lodash');
const libYaml = require('js-yaml');
const commander = require('commander');

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
	const args = commander
		.version(env.version)
		.description(env.description)
		
		.option('--repl', 'Start a REPL environment')
		.parse(env.argv);
	
	target.repl = args.repl;
	return target;
}

/**
 * Load settings from multiple source files.
 * @param {Environment} env Environment to load the settings from.
 * @returns {AppSettings}
 */
function loadSettingsSync(env) {
	const settings = {};
	
	// Load base settings, eg. settings.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.yaml');
		
	// Load environment based settings, eg. settings.production.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.' + env.node_env + '.yaml', false);
	
	// Load optional local settings, eg. settings.local.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.local.yaml', false);
	
	// Load environment-based local settings, eg. settings.test.local.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.' + env.node_env + '.local.yaml', false);
	
	// Load settings from argv
	loadSettingsFromCommandLine(settings, env);
	
	return settings;
}

module.exports = {
	loadSettingsSync
};