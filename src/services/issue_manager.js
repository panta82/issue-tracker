const lodash = require("lodash");

const ISSUE = require('../entities/issues').ISSUE;

class IssueManagerOptions {
	constructor(source) {
		/**
		 * Used for pagination, if nothing is supplied by client
		 * @type {number}
		 */
		this.default_page_size = 20;
		
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
		createIssue,
		listIssues
	});
	
	/**
	 * Create a new issue
	 * @param {User} user
	 * @param {Issue} issue
	 */
	function createIssue(user, issue) {
		log.trace2(createIssue, arguments);
		
		issue = new deps.Issue(issue);
		issue.author = user._id;
		return issue.save();
	}
	
	/**
	 * List all issues
	 * @param [page]
	 * @param [pageSize]
	 */
	function listIssues(page, pageSize) {
		log.trace2(listIssues, arguments);
		
		page = page || 1;
		pageSize = pageSize || options.default_page_size;
		
		return deps.Issue.paginate({}, {
			page,
			limit: pageSize,
			populate: ISSUE.author,
		});
	}
}

// *********************************************************************************************************************

module.exports = {
	IssueManager
};