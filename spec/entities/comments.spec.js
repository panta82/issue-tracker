const expect = require('chai').expect;
const sinon = require('sinon');

const {getTestDatabase, prepareTestDatabase, resetTestDatabase, closeTestDatabase, testModelValidationRequired} = require('../test_tools');
const libComments = require('../../src/entities/comments');

describe('comments', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	describe('model', () => {
		it('validates that issue is required', (done) => {
			const Comment = libComments.createCommentModel(getTestDatabase());
			
			testModelValidationRequired(Comment, libComments.COMMENT.issue, done);
		});
		
		it('validates that content is required', (done) => {
			const Comment = libComments.createCommentModel(getTestDatabase());
			
			testModelValidationRequired(Comment, libComments.COMMENT.content, done);
		});
		
		it('validates that author is required', (done) => {
			const Comment = libComments.createCommentModel(getTestDatabase());
			
			testModelValidationRequired(Comment, libComments.COMMENT.author, done);
		});
	});
});