const libPath = require('path');

const libFormidable = require('formidable');
const lodash = require("lodash");

const {CustomError} = require('../entities/errors');

class UploadManagerOptions {
	constructor(source) {
		/**
		 * Location where to keep uploaded files
		 * @type {string}
		 */
		this.directory = '/tmp/uploads';
		
		lodash.merge(this, source);
	}
}

/**
 * @param options
 * @param {App} deps
 */
function UploadManager(options, deps) {
	options = new UploadManagerOptions(options);
	
	const log = deps.logger.prefixed('UploadManager');
	
	// This is used to ensure we never get two same ID-s
	let _lastId = 0;
	
	Object.assign(this, /** @lends UploadManager.prototype */ {
		acceptUpload
	});
	
	/**
	 * Delete temp files for an upload. This should be called after the receiving service has dealt with uploaded files
	 * @param {Upload} upload
	 * @return void
	 */
	function releaseUpload(upload) {
		log.trace1(releaseUpload, arguments);
		
		deps.fileUtility.remove(upload.directory)
			.then(
				() => log.verbose(`Upload ${upload.id} released`),
				log.errorHandler
			);
	}
	
	/**
	 * Accepts upload from express request object. Calls back with Upload object
	 * @param {Request} req
	 * @return {Promise<Upload>}
	 */
	function acceptUpload(req) {
		log.trace1(acceptUpload, arguments);
		
		const startedAt = new Date();
		let id = startedAt.getTime();
		while (id <= _lastId) {
			id++;
		}
		_lastId = id;
		log.verbose(`Upload ${id} from ${req.url} started at ${startedAt}`);
		
		const upload = new Upload();
		upload.id = id;
		upload.started_at = startedAt;
		upload.directory = libPath.resolve(options.directory, `upload_${id}/`);
		
		return deps.fileUtility.emptyDir(upload.directory).then(() => {
			const form = new libFormidable.IncomingForm();
			form.uploadDir = upload.directory;
			form.keepExtensions = true;
			
			// TODO: Good extension feature is to allow handling multiple files per upload
			form.multiples = false;
			
			form.on('fileBegin', (name, file) => {
				// This will keep final file path meaningful and preserve the name
				file.path = libPath.resolve(form.uploadDir, file.name);
			});
			
			return new Promise((resolve, reject) => {
				return form.parse(req, (err, fields, files) => {
					if (err) {
						releaseUpload(upload);
						return reject(err);
					}
					
					upload.completed_at = new Date();
					upload.files = lodash.map(files, (file, field) => {
						file = new UploadFile(file);
						file.field = field;
						return file;
					});
					
					if (!upload.files.length) {
						// No files were uploaded
						releaseUpload(upload);
						return reject(new UploadManagerError(`No files were uploaded`, 400));
					}
					
					upload.release = releaseUpload.bind(null, upload);
					
					log.info(`Upload ${id} completed after (${upload.started_at - upload.completed_at}) ms. ${upload.files.length} files staged`);
					
					return resolve(upload);
				});
			});
		});
	}
}

// *********************************************************************************************************************

class Upload {
	constructor(source) {
		this.id = null;
		this.directory = null;
		this.started_at = null;
		this.completed_at = null;
		
		/**
		 * List of uploaded files. Guaranteed to have at least one file.
		 * @type {UploadFile[]}
		 **/
		this.files = [];
		
		/**
		 * Call this to release this upload once you are done processing. This will clean up any remaining tmp files
		 * @type {function():void}
		 */
		this.release = null;
		
		lodash.assign(this, source);
	}
}

class UploadFile {
	constructor(source) {
		this.size = 0;
		this.path = null;
		this.name = null;
		this.type = null;
		this.hash = null;
		this.field = null;
		this.lastModifiedDate = null;
		
		lodash.assign(this, source);
	}
}

// *********************************************************************************************************************

class UploadManagerError extends CustomError {
	constructor(message, code) {
		super(message, code);
	}
}

// *********************************************************************************************************************

module.exports = {
	UploadManager,
};