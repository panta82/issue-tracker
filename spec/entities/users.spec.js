const expect = require('chai').expect;
const sinon = require('sinon');

const {getTestDatabase, prepareTestDatabase, resetTestDatabase, closeTestDatabase, testModelValidationRequired} = require('../test_tools');
const libUsers = require('../../src/entities/users');

describe('users', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	describe('user model', () => {
		it('validates that username is required', (done) => {
			const User = libUsers.createUserModel(getTestDatabase());
			
			testModelValidationRequired(User, libUsers.USER.username, done);
		});
		
		it('validates that password hash is required', (done) => {
			const User = libUsers.createUserModel(getTestDatabase());
			
			testModelValidationRequired(User, libUsers.USER.password_hash, done);
		});
		
		it('validates that username is unique', () => {
			const User = libUsers.createUserModel(getTestDatabase());
			
			const u1 = new User({
				username: 'duplicate',
				password_hash: 'abc'
			});
			
			return u1.save()
				.then(() => {
					const u2 = new User({
						username: 'duplicate',
						password_hash: 'abc'
					});
					
					return u2.save();
				})
				.then(sinon.stub().throws(), (err) => {
					expect(err).to.be.instanceOf(Error);
					expect(err.code).to.equal(11000);
				});
		});
		
		it(`doesn't return password hash by default`, () => {
			const User = libUsers.createUserModel(getTestDatabase());
			
			const u = new User({
				username: 'test',
				password_hash: 'abc'
			});
			
			return u.save()
				.then(() => {
					return User.findOne({username: 'test'});
				})
				.then(/** User */ user => {
					expect(user.username).to.equal('test');
					expect(user.password_hash).to.be.undefined;
				});
		});
	});
});