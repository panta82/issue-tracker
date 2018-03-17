const lodash = require("lodash");

const NotFoundError = require('../entities/errors').NotFoundError;
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
		getIssueById,
		listIssues,
		createIssue,
		updateIssue,
		deleteIssue
	});
	
	/**
	 * Simple issue getter. If issue is not found, it will throw error
	 * @param id
	 * @return {Promise<Issue>}
	 */
	function getIssueById(id) {
		log.trace2(getIssueById, arguments);
		
		return deps.Issue.findById(id)
			.then(IssueNotFoundError.guard(id))
			.then(issue => {
				return issue.populate(ISSUE.author);
			});
	}
	
	/**
	 * List all issues, with pagination
	 * @param [page]
	 * @param [pageSize]
	 */
	function listIssues(page, pageSize) {
		log.trace2(listIssues, arguments);
		
		page = page || 1;
		pageSize = pageSize || options.default_page_size;
		
		return deps.Issue.paginate({
			[ISSUE.deleted_at]: null
		}, {
			page,
			limit: pageSize,
			populate: ISSUE.author,
		});
	}
	
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
	 * Update issue. Anyone can update anyone else-s issue. TODO: Is this right? Should we have auth check here?
	 * @param id
	 * @param {Issue} payload
	 */
	function updateIssue(id, payload) {
		log.trace1(updateIssue, arguments);
		
		return getIssueById(id)
			.then(issue => {
				Object.assign(issue, payload);
				return issue.save();
			});
	}
	
	/**
	 * Soft-delete issue, by setting deleted_at timestamp
	 * @param id
	 */
	function deleteIssue(id) {
		log.trace1(deleteIssue, arguments);
		
		return getIssueById(id)
			.then(issue => {
				if (!issue.deleted_at) {
					issue.deleted_at = new Date();
				}
				return issue.save();
			});
	}
}

// *********************************************************************************************************************

class IssueNotFoundError extends NotFoundError {
	constructor(id) {
		super(`Issue "${id}" was not found`);
	}
}

// *********************************************************************************************************************

module.exports = {
	IssueManager
};