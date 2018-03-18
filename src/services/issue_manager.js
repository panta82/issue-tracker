const lodash = require("lodash");

const {CustomError, NotFoundError} = require('../entities/errors');
const ISSUE = require('../entities/issues').ISSUE;
const COMMENT = require('../entities/comments').COMMENT;

class IssueManagerOptions {
	constructor(source) {
		/**
		 * Used for pagination, if nothing is supplied by client
		 * @type {number}
		 */
		this.issues_page_size = 20;
		
		/**
		 * Used for pagination, if nothing is supplied by client
		 * @type {number}
		 */
		this.comments_page_size = 20;
		
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
		validateIssueId,
		getIssueById,
		listIssues,
		createIssue,
		updateIssue,
		deleteIssue,
		
		addComment,
		listComments
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
		pageSize = pageSize || options.issues_page_size;
		
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
	
	/**
	 * Validates that issue exists and is not soft-deleted. Used to allow/disallow operations against issues.
	 * @param issueId
	 */
	function validateIssueId(issueId) {
		log.trace2(validateIssueId, arguments);
		
		return deps.Issue.findById(issueId)
			.select(ISSUE.deleted_at)
			.then(IssueNotFoundError.guard(issueId))
			.then(issue => {
				if (issue.deleted_at) {
					throw new IssueManagerError(`Issue ${issueId} has been deleted`, 400);
				}
				
				return true;
			});
	}
	
	/**
	 * Add comment to an issue
	 * @param {User} user
	 * @param {string} issueId
	 * @param {Comment} payload
	 */
	function addComment(user, issueId, payload) {
		log.trace1(addComment, arguments);
		
		return validateIssueId(issueId)
			.then(() => {
				const comment = new deps.Comment({
					...payload,
					[COMMENT.issue]: issueId,
					[COMMENT.author]: user._id,
				});
				
				return comment.save();
			})
			.then(comment => {
				return comment.populate(COMMENT.author);
			});
	}
	
	/**
	 * List comments for a specific issue. The comments are served in reverse chronological order (newest first)
	 * @param issueId
	 * @param page
	 * @param pageSize
	 */
	function listComments(issueId, page, pageSize) {
		log.trace1(listComments, arguments);
		
		return validateIssueId(issueId)
			.then(() => {
				page = page || 1;
				pageSize = pageSize || options.comments_page_size;
				
				return deps.Comment.paginate({
					[COMMENT.issue]: issueId,
					[COMMENT.deleted_at]: null
				}, {
					page,
					limit: pageSize,
					populate: COMMENT.author,
					sort: {
						[COMMENT.created_at]: 'desc',
					}
				});
			});
	}
}

// *********************************************************************************************************************

class IssueManagerError extends CustomError {
	constructor(message, code) {
		super(message, code);
	}
}

class IssueNotFoundError extends NotFoundError {
	constructor(id) {
		super(`Issue "${id}" was not found`);
	}
}

// *********************************************************************************************************************

module.exports = {
	IssueManager
};