const expect = require('chai').expect;
const sinon = require('sinon');

const libPath = require('path');
const libUtil = require('util');
const libFs = require('fs');

const readFile = libUtil.promisify(libFs.readFile);

const {prepareTestDatabase, resetTestDatabase, closeTestDatabase, getTestApp, prepareTestFiles, STAGING_PATH} = require('../test_tools');
const {DocumentStore} = require('../../src/services/document_store');

describe('DocumentStore', () => {
	before(prepareTestDatabase);
	after(closeTestDatabase);
	beforeEach(resetTestDatabase);
	
	function testUser(app, data) {
		const user = new app.User({
			_id: new app.mongoose.Types.ObjectId(),
		});
		Object.assign(user, data);
		return user;
	}
	
	describe('addDocumentFromPath', () => {
		it('will add document from local path', () => {
			/** @type App */
			const app = getTestApp();
			
			app.issueManager = {
				validateIssueId: sinon.spy(() => Promise.resolve())
			};
			
			const store = new DocumentStore(app.settings.DocumentStore, app);
			
			const user = testUser(app);
			const sourcePath = libPath.resolve(STAGING_PATH, 'file1.txt');
			const issueId = app.mongoose.Types.ObjectId();
			
			return prepareTestFiles(app)
				.then(() => {
					return store.addDocumentFromPath(user, issueId, sourcePath);
				})
				.then(/** Document */ document => {
					expect(document.filename).to.equal('file1.txt');
					expect(document.bucket).to.be.ok;
					expect(document.uploader).to.eql(user._id);
					expect(document.issue).to.eql(issueId);
					expect(document.extension).to.equal('txt');
					
					const expectedLocation = libPath.resolve(
						app.settings.DocumentStore.directory,
						document.bucket,
						document._id + '.' + document.extension
					);
					
					return readFile(expectedLocation, 'utf8');
				})
				.then(content => {
					expect(content).to.equal('Content of file 1');
				});
		});
	});
});