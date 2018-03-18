const libPath = require('path');

const lodash = require('lodash');
const moment = require('moment');

const {CustomError, NotFoundError} = require('../entities/errors');
const DOCUMENT = require('../entities/documents').DOCUMENT;
const FileDownload = require('../lib/files').FileDownload;

class DocumentStoreOptions {
	constructor(source) {
		/**
		 * Location where to keep documents
		 * @type {string}
		 */
		this.directory = null;
		
		/**
		 * Used for pagination, if nothing is supplied by client
		 * @type {number}
		 */
		this.page_size = 20;
		
		lodash.merge(this, source);
	}
}

/**
 * @param options
 * @param {App} deps
 */
function DocumentStore(options, deps) {
	options = new DocumentStoreOptions(options);
	
	const log = deps.logger.prefixed('DocumentStore');
	
	if (!options.directory) {
		throw new DocumentStoreError(`Mandatory option "DocumentStore.directory" not provided. You must specify where `
			+ `will we store documents. Please do not use /tmp paths, as that will corrupt your local store `
			+ `when you restart the computer`);
	}
	
	Object.assign(this, /** @lends DocumentStore.prototype */ {
		uploadDocument,
		listDocumentsForIssue,
		prepareDocumentDownload
	});
	
	/**
	 * @param {string} bucket
	 * @return {string}
	 */
	function getBucketPath(bucket) {
		return libPath.resolve(options.directory, bucket);
	}
	
	/**
	 * @param {Document} document
	 * @return {string}
	 */
	function getDocumentPath(document) {
		const bucketPath = getBucketPath(document.bucket);
		return libPath.resolve(bucketPath, document._id + '.' + document.extension);
	}
	
	/**
	 * Add document from a path on local file system
	 * @param {User} user
	 * @param issueId
	 * @param sourcePath This file will be consumed (moved) when creating document.
	 */
	function addDocumentFromPath(user, issueId, sourcePath) {
		log.trace1(addDocumentFromPath, arguments);
		
		const document = new deps.Document();
		document._id = new deps.mongoose.Types.ObjectId();
		document.filename = libPath.basename(sourcePath);
		document.extension = libPath.extname(sourcePath).slice(1);
		document.issue = issueId;
		document.uploader = user._id;
		document.bucket = moment().format('YYYY_MM');
		
		const destinationPath = getDocumentPath(document);
		
		// Used to detect rollback mechanics in case of errors
		let documentMoved = false;
		
		return deps.issueManager.validateIssueId(issueId)
			.then(() => {
				return deps.fileUtility.ensureDir(getBucketPath(document.bucket));
			})
			.then(() => {
				return deps.fileUtility.move(sourcePath, destinationPath);
			})
			.then(() => {
				documentMoved = true;
				
				return document.save();
			})
			.catch(err => {
				if (!documentMoved) {
					// No need for rollback
					throw err;
				}
				
				return deps.fileUtility.move(destinationPath, sourcePath)
					.then(
						() => {
							// We have rolled back the file. We can now error out.
							throw err;
						},
						rollbackErr => {
							// Uh-oh. We failed to roll back the file. So we are stuck.
							log.warn(`File ${destinationPath} has remained stuck after failed creation of document ${document._id}`);
							log.error(rollbackErr);
							
							// Throw the original error
							throw err;
						}
					);
			});
	}
	
	/**
	 * Add document directly from an upload
	 * @param {User} user
	 * @param issueId
	 * @param req Incoming request with upload stream
	 */
	function uploadDocument(user, issueId, req) {
		log.trace1(uploadDocument, arguments);
		
		return deps.issueManager.validateIssueId(issueId).then(() => {
			return deps.uploadManager.acceptUpload(req).then(upload => {
				
				const sourcePath = upload.files[0].path;
				
				return addDocumentFromPath(user, issueId, sourcePath).then(document => {
					upload.release();
					return document.populate(DOCUMENT.uploader);
				});
			});
		});
	}
	
	/**
	 * List documents for a specific issue
	 * @param issueId
	 * @param page
	 * @param pageSize
	 */
	function listDocumentsForIssue(issueId, page, pageSize) {
		log.trace2(listDocumentsForIssue, arguments);
		
		return deps.issueManager.validateIssueId(issueId)
			.then(() => {
				page = page || 1;
				pageSize = pageSize || options.page_size;
				
				return deps.Document.paginate({
					[DOCUMENT.issue]: issueId,
					[DOCUMENT.deleted_at]: null
				}, {
					page,
					limit: pageSize,
					populate: DOCUMENT.uploader
				});
			});
	}
	
	/**
	 * Returns document record. If not found, it will throw error
	 * @param id
	 * @return {Promise<Document>}
	 */
	function getDocumentById(id) {
		log.trace2(getDocumentById, arguments);
		
		return deps.Document.findById(id)
			.then(DocumentNotFoundError.guard(id))
			.then(document => {
				return document.populate(DOCUMENT.uploader);
			});
	}
	
	/**
	 * Prepare file download for a specific document. Caller will be able to initiate download by calling "send"
	 * @param documentId
	 * @return Promise<FileDownload>
	 */
	function prepareDocumentDownload(documentId) {
		log.trace1(prepareDocumentDownload, arguments);
		
		return getDocumentById(documentId)
			.then(document => {
				const download = new FileDownload(getDocumentPath(document), document.filename);
				return download;
			});
	}
}

// *********************************************************************************************************************

class DocumentStoreError extends CustomError {
	constructor(message, code) {
		super(message, code);
	}
}

class DocumentNotFoundError extends NotFoundError {
	constructor(id) {
		super(`Document "${id}" was not found`);
	}
}

// *********************************************************************************************************************

module.exports = {
	DocumentStore,
};