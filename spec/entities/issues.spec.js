const expect = require('chai').expect;
const sinon = require('sinon');

const {getTestDatabase, prepareTestDatabase, resetTestDatabase, closeTestDatabase, testModelValidationRequired} = require('../test_tools');
const libUsers = require('../../src/entities/users');
const libIssues = require('../../src/entities/issues');

describe('issues', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	describe('model', () => {
		it('can be created with valid data', () => {
			const User = libUsers.createUserModel(getTestDatabase());
			const Issue = libIssues.createIssueModel(getTestDatabase());
			
			return new User({username: 'test', password_hash: 'abc'})
				.save()
				.then((user) => {
					const issue = new Issue({
						title: 'test',
						content: 'My issue',
						status: libIssues.ISSUE_STATUSES.complete,
						author: user._id
					});
					
					return issue.save();
				})
				.then(issue => {
					expect(issue.id).to.be.ok;
					expect(issue.author).to.be.ok;
					expect(issue.title).to.equal('test');
					expect(issue.status).to.equal('complete');
					expect(issue.content).to.equal('My issue');
				});
		});
		
		it('validates that title is required', (done) => {
			const Issue = libIssues.createIssueModel(getTestDatabase());
			
			testModelValidationRequired(Issue, libIssues.ISSUE.title, done);
		});
		
		it('validates that author is required', (done) => {
			const User = libUsers.createUserModel(getTestDatabase());
			const Issue = libIssues.createIssueModel(getTestDatabase());
			
			testModelValidationRequired(Issue, libIssues.ISSUE.author, done);
		});
		
		it('validates status', () => {
			const mongoose = getTestDatabase();
			
			const Issue = libIssues.createIssueModel(mongoose);
			
			const issue = new Issue({
				title: 'abc',
				author: new mongoose.Types.ObjectId(),
				status: 'invalid'
			});
			
			return issue.save().then(sinon.stub().throws(), (err) => {
				expect(err.name).to.equal('ValidationError');
				expect(err.errors.status.kind).to.equal('enum');
			});
		});
		
		it(`validates that title must not be longer than ${libIssues.ISSUE_TITLE_MAX_LENGTH}`, () => {
			const mongoose = getTestDatabase();
			const Issue = libIssues.createIssueModel(mongoose);
			
			const issue = new Issue({
				title: 'very long title, long exactly 201 characters, which is 1 more than current limit. And some padding padding padding padding padding padding padding padding padding padding padding padding padding, done!',
				author: new mongoose.Types.ObjectId()
			});
			
			return issue.save().then(sinon.stub().throws(), (err) => {
				expect(err.name).to.equal('ValidationError');
				expect(err.errors.title.kind).to.equal('maxlength');
			});
		});
	});
});