const expect = require('chai').expect;
const {Mongoose} = require('mongoose');
const libPath = require('path');

const libSettings = require('../src/settings');
const {Environment, NODE_ENVS} = require('../src/environment');

const {Logger} = require('../src/lib/logger');
const {FileUtility} = require('../src/lib/files');
const {createUserModel} = require('../src/entities/users');
const {createIssueModel} = require('../src/entities/issues');
const {createCommentModel} = require('../src/entities/comments');
const {createDocumentModel} = require('../src/entities/documents');

let mongoose = null;
let environment = null;
let settings = null;

const MASTER_PATH = libPath.resolve(__dirname, './files/master');
const STAGING_PATH = libPath.resolve(__dirname, './files/staging');

/**
 * Return previously created test database. Throws if it hasn't been created yet.
 * @returns {Mongoose|mongoose}
 */
function getTestDatabase() {
	if (!mongoose) {
		throw new Error(`Test database not created`);
	}
	
	if (mongoose.connection.readyState !== 1) {
		throw new Error('Test database not ready');
	}
	
	return mongoose;
}

/**
 * Configures a test instance of mongoose and connects to the test database.
 * @return {Promise<Mongoose>}
 */
function prepareTestDatabase() {
	if (mongoose) {
		return Promise.resolve(mongoose);
	}
	
	if (!environment) {
		environment = new Environment();
		environment.description = 'test description';
		environment.name = 'test name';
		environment.version = '1.2.3';
		environment.argv = ['node', 'app-name'];
		environment.node_env = NODE_ENVS.test;
	}
	settings = settings || libSettings.loadSettingsSync(environment);
	mongoose = new Mongoose();
	
	return mongoose.connect(settings.Mongo.connection_string).then(
		() => {
			return mongoose;
		},
		err => {
			// Just kill the test
			throw new Error(`Failed to connect to test database "${settings.Mongo.connection_string}": ${err.message}`);
		}
	);
}

/**
 * Disposes of test database. Tests should call this once they are done.
 * Otherwise, they will remain hanging with open connection
 */
function closeTestDatabase() {
	if (mongoose) {
		mongoose.disconnect();
		mongoose = null;
	}
}

/**
 * Clear all data from database.
 * Notes: This was trickier than it seems. Mongo also has mongoose.connection.db.dropDatabase(),
 * 	      but that would also clear all the indexes and validations that mongoose has set up.
 * 	      We also don't have the master list of all the models so that we can clear through that.
 * 	      This solution is probably the most efficient
 * 	      (inspiration: https://github.com/elliotf/mocha-mongoose/blob/master/index.js)
 * @return {*}
 */
function resetTestDatabase() {
	if (!mongoose) {
		return;
	}
	if (!mongoose.connection.db) {
		throw new Error(`Test database is not ready`);
	}
	
	return mongoose.connection.db.collections()
		.then(collections => {
			const promises = [];
			collections.forEach(collection => {
				if (collection.collectionName.match(/^system\./)) {
					return;
				}
				promises.push(collection.remove({}, {safe: true}));
			});
			return Promise.all(promises);
		});
}

/**
 * Create a test container with some standard services
 * @return {App}
 */
function getTestApp() {
	const mongoose = getTestDatabase();
	const testApp = {
		settings,
		environment,
		mongoose,
		
		/** @type {function(new:User)|Model<User>} */
		User: createUserModel(mongoose),
	
		/** @type {function(new:Issue)|Model<Issue>} */
		Issue: createIssueModel(mongoose),
	
		/** @type {function(new:Comment)|Model<Comment>} */
		Comment: createCommentModel(mongoose),
		
		/** @type {function(new:Document)|Model<Document>} */
		Document: createDocumentModel(mongoose),
	};
	testApp.logger = new Logger({console: false});
	testApp.fileUtility = new FileUtility({}, testApp);
	
	return testApp;
}

/**
 * Generic test that a field on a model is tested for required-ness
 * @param Model
 * @param field
 * @param done
 */
function testModelValidationRequired(Model, field, done) {
	const m = new Model({
		[field]: null
	});
	
	m.validate(err => {
		expect(err.errors[field]).to.exist;
		expect(err.errors[field].kind).to.equal('required');
		done();
	});
}

/**
 * Prepare test files on HDD.
 * @param {App} app
 */
function prepareTestFiles(app) {
	return app.fileUtility.emptyDir(STAGING_PATH)
		.then(() => {
			return app.fileUtility.copy(MASTER_PATH, STAGING_PATH);
		});
}

/**
 * Generate tests for mongoose "required" fields.
 * @param it Function from the test scope
 * @param modelName Eg "Issue"
 * @param fieldNames List of field names
 */
function testRequiredFields(it, modelName, fieldNames) {
	fieldNames.forEach(fieldName => {
		it(`validates that ${fieldName} is required`, (done) => {
			const app = getTestApp();
			const Model = app[modelName];
			
			const m = new Model({
				[fieldName]: null
			});
			
			m.validate(err => {
				expect(err.errors[fieldName]).to.exist;
				expect(err.errors[fieldName].kind).to.equal('required');
				done();
			});
		});
	});
}

module.exports = {
	STAGING_PATH,
	
	getTestDatabase,
	prepareTestDatabase,
	resetTestDatabase,
	closeTestDatabase,
	
	getTestApp,
	
	prepareTestFiles,
	
	testRequiredFields
};