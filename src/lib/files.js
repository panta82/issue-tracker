const libFs = require('fs');
const libUtil = require('util');

const lodash = require('lodash');
const fsExtra = require('fs-extra');

// *********************************************************************************************************************

class FileUtilityOptions {
	constructor(source) {
		lodash.merge(this, source);
	}
}

/**
 * @param options
 * @param {App} deps
 */
function FileUtility(options, deps) {
	options = new FileUtilityOptions(options);
	
	const log = deps.logger.prefixed('FileUtility');
	
	const fsRename = libUtil.promisify(libFs.rename);
	
	Object.assign(this, /** @lends FileUtility.prototype */ {
		ensureDir,
		emptyDir,
		move,
		remove,
		copy
	});
	
	/**
	 * Makes sure directory exists (creates it recursively if not)
	 * @param {String} path
	 * @return {Promise<any>}
	 */
	function ensureDir(path) {
		log.trace2(ensureDir, arguments);
		
		return fsExtra.ensureDir(path);
	}
	
	/**
	 * Makes sure directory exists and is empty
	 * @param {String} path
	 * @return {Promise<any>}
	 */
	function emptyDir(path) {
		log.trace2(emptyDir, arguments);
		
		return fsExtra.emptyDir(path);
	}
	
	/**
	 * Move file or directory from one path to another
	 * @param fromPath
	 * @param toPath
	 * @return {Promise<any>}
	 */
	function move(fromPath, toPath) {
		log.trace2(move, arguments);
		
		if (fromPath === toPath) {
			return Promise.resolve();
		}
		
		return fsRename(fromPath, toPath);
	}
	
	/**
	 * Delete file or directory
	 * @param path
	 * @return {Promise<any>}
	 */
	function remove(path) {
		log.trace2(remove, arguments);
		
		return fsExtra.remove(path);
	}
	
	/**
	 * Copy file or directory
	 * @param fromPath
	 * @param toPath
	 */
	function copy(fromPath, toPath) {
		log.trace2(copy, arguments);
		
		return fsExtra.copy(fromPath, toPath);
	}
}

// *********************************************************************************************************************

/**
 * Class that packages all the needed info the execute file download.
 */
class FileDownload {
	constructor(path, filename) {
		this.path = path;
		this.filename = filename;
	}
	
	/**
	 * Send file using express response
	 * @param res
	 */
	send(res) {
		res.sendFile(this.path, {
			headers: {
				'Content-disposition': 'attachment; filename=' + this.filename
			}
		});
	}
}

// *********************************************************************************************************************

module.exports = {
	FileUtility,
	
	FileDownload
};