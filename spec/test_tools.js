const expect = require('chai').expect;
const {Mongoose} = require('mongoose');

const libSettings = require('../src/settings');

let mongoose = null;
let settings = null;

/**
 * Create a mongoose connected to test database or returns one, if already exists.
 * @return {Mongoose}
 */
function getTestDatabase() {
	if (mongoose) {
		return mongoose;
	}
	
	settings = settings || libSettings.loadSettingsSync('test');
	mongoose = new Mongoose();
	
	// We will not wait for this to end or handle errors.
	// We will sacrifice correctness for simplicity and api ease of use
	mongoose.connect(settings.Mongo.connection_string);
	
	return mongoose;
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

module.exports = {
	getTestDatabase,
	closeTestDatabase,
	
	testModelValidationRequired
};