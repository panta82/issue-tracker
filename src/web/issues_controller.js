const Joi = require('joi');

const {mongooseToSwagger, objectIdValidator} = require('../lib/validation');
const {issueValidators} = require('../entities/issues');
const {commentValidator} = require('../entities/comments');
const API_PREFIX = require('../entities/consts').API_PREFIX;

/**
 * @param {App} app
 */
function issuesController(app) {
	app.server.use(API_PREFIX + '/issues', app.auth.middleware);
	
	// *****************************************************************************************************************
	
	app.server.get(
		API_PREFIX + '/issues',
		`List all issues in system (with pagination)`,
		{
			response: mongooseToSwagger({
				_: app.Issue,
				author: app.User
			}),
			paginated: true
		},
		req => {
			return app.issueManager.listIssues(req.data.query.page, req.data.query.page_size);
		}
	);
	
	app.server.get(
		API_PREFIX + '/issues/:id',
		`Get a single issue`,
		{
			params: {
				id: objectIdValidator
			},
			response: mongooseToSwagger({
				_: app.Issue,
				author: app.User
			})
		},
		req => {
			return app.issueManager.getIssueById(req.data.params.id);
		}
	);
	
	app.server.post(
		API_PREFIX + '/issues',
		`Create a new issue`,
		{
			body: issueValidators.create
		},
		req => {
			return app.issueManager.createIssue(req.user, req.data.body);
		}
	);
	
	app.server.put(
		API_PREFIX + '/issues/:id',
		`Update existing issue. Anyone logged in can update the issue`,
		{
			params: {
				id: objectIdValidator
			},
			body: issueValidators.update,
			response: mongooseToSwagger(app.Issue)
		},
		req => {
			return app.issueManager.updateIssue(req.data.params.id, req.data.body);
		}
	);
	
	app.server.delete(
		API_PREFIX + '/issues/:id',
		`Soft delete issue. The issue will no longer be listed through the resource,
		although you will still be able to get it directly through id`,
		{
			params: {
				id: objectIdValidator
			},
			response: mongooseToSwagger(app.Issue)
		},
		req => {
			return app.issueManager.deleteIssue(req.data.params.id);
		}
	);
	
	// *****************************************************************************************************************
	
	app.server.get(
		API_PREFIX + '/issues/:id/comments',
		`List comments for an issues, with pagination. Comments are sorted from the newest first`,
		{
			params: {
				id: objectIdValidator
			},
			response: mongooseToSwagger({
				_: app.Issue,
				author: app.User
			}),
			paginated: true
		},
		req => {
			return app.issueManager.listComments(req.data.params.id, req.data.query.page, req.data.query.page_size);
		}
	);
	
	app.server.post(
		API_PREFIX + '/issues/:id/comments',
		`Add a comment for a specific issue`,
		{
			params: {
				id: objectIdValidator
			},
			body: commentValidator,
			response: mongooseToSwagger(app.Comment)
		},
		req => {
			return app.issueManager.addComment(req.user, req.data.params.id, req.data.body);
		}
	);
}

module.exports = issuesController;