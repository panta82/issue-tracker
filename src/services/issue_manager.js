const lodash = require("lodash");

const ISSUE = require('../entities/issues').ISSUE;

class IssueManagerOptions {
	constructor(source) {
		lodash.merge(this, source);
	}
}

/**
 * @param options
 * @param {App} deps
 */
function IssueManager(options, deps) {
	options = new IssueManagerOptions(options);
	
	const log = deps.logger.prefixed('IssueManager');

	Object.assign(this, /** @lends IssueManager.prototype */ {
		createIssue
	});
	
	/**
	 * Create a new user in the system
	 */
	function createIssue(user, issue) {
		log.trace2(createIssue, arguments);
		
		console.log('TODO create', user, issue);
	}
}

// *********************************************************************************************************************

module.exports = {
	IssueManager
};