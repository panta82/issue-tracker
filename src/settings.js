const libPath = require('path');
const libFs = require('fs');

const errno = require('enumconsts').errno;
const lodash = require('lodash');
const libYaml = require('js-yaml');

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
 * Load settings from multiple source files.
 * @param environment Environment in which to operate. 'production', 'development' or 'test'
 * @returns {AppSettings}
 */
function loadSettingsSync(environment) {
	environment = environment || process.env.NODE_ENV || 'development';
	
	const settings = {};
	
	// Load base settings, eg. settings.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.yaml');
		
	// Load environment based settings, eg. settings.production.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.' + environment + '.yaml');
	
	// Load optional local settings, eg. settings.local.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.local.yaml', false);
	
	// Load environment-based local settings, eg. settings.test.local.yaml
	loadSettingsFromFileSync(settings, BASE_NAME + '.' + environment + '.local.yaml', false);
	
	return settings;
}

module.exports = {
	loadSettingsSync
};