const expect = require('chai').expect;
const sinon = require('sinon');

const {prepareTestDatabase, resetTestDatabase, closeTestDatabase, testRequiredFields} = require('../test_tools');
const libComments = require('../../src/entities/comments');

describe('comments', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	describe('model', () => {
		testRequiredFields(it, 'Comment', [
			libComments.COMMENT.issue,
			libComments.COMMENT.content,
			libComments.COMMENT.author
		]);
	});
});