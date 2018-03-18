const expect = require('chai').expect;
const sinon = require('sinon');

const {prepareTestDatabase, resetTestDatabase, closeTestDatabase, testRequiredFields} = require('../test_tools');
const libComments = require('../../src/entities/comments');
const libDocuments = require('../../src/entities/documents');

describe('documents', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	describe('model', () => {
		testRequiredFields(it, 'Document', [
			libDocuments.DOCUMENT.issue,
			libDocuments.DOCUMENT.uploader,
			libDocuments.DOCUMENT.bucket,
			libDocuments.DOCUMENT.filename,
		]);
	});
});