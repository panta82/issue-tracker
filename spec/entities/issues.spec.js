const expect = require('chai').expect;
const sinon = require('sinon');

const {getTestDatabase, prepareTestDatabase, resetTestDatabase, closeTestDatabase, testModelValidationRequired} = require('../test_tools');
const libIssues = require('../../src/entities/issues');

describe('issues', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	describe('issue model', () => {
		it('validates that title is required', (done) => {
			const Issue = libIssues.createIssueModel(getTestDatabase());
			
			testModelValidationRequired(Issue, libIssues.ISSUE.title, done);
		});
		
		it(`validates that title must not be longer than ${libIssues.ISSUE_TITLE_MAX_LENGTH}`, (done) => {
			const mongoose = getTestDatabase();
			const Issue = libIssues.createIssueModel(mongoose);
			
			const issue = new Issue({
				title: 'very long title, long exactly 201 characters, which is 1 more than current limit. And some padding padding padding padding padding padding padding padding padding padding padding padding padding, done!',
				author: new mongoose.Types.ObjectId()
			});
			
			issue.save().then(sinon.stub().throws(), (err) => {
				expect(err).to.be.instanceOf(Error);
				expect(err.name).to.equal('ValidationError');
				expect(err.errors.title.kind).to.equal('maxlength');
				done();
			});
		});
	});
});