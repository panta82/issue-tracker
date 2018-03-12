const expect = require('chai').expect;
const sinon = require('sinon');

const {getTestDatabase, closeTestDatabase, testModelValidationRequired} = require('../test_tools');
const libUsers = require('../../src/entities/users');

describe('users', () => {
	let mongoose;
	
	before(() => {
		mongoose = getTestDatabase();
	});
	
	after(() => {
		closeTestDatabase();
	});
	
	describe('user model', () => {
		it('validates that username is required', (done) => {
			const User = libUsers.createUserModel(mongoose);
			
			testModelValidationRequired(User, libUsers.USER.username, done);
		});
		
		it('validates that password hash is required', (done) => {
			const User = libUsers.createUserModel(mongoose);
			
			testModelValidationRequired(User, libUsers.USER.password_hash, done);
		});
		
		it('validates that username is unique', (done) => {
			const User = libUsers.createUserModel(mongoose);
			
			const u1 = new User({
				username: 'duplicate',
				password_hash: 'abc'
			});
			
			return u1.save(() => {
				const u2 = new User({
					username: 'duplicate',
					password_hash: 'abc'
				});
				
				return u2.save().then(sinon.stub().throws(), (err) => {
					expect(err).to.be.instanceOf(Error);
					expect(err.code).to.equal(11000);
					done();
				});
			});
		});
	});
});