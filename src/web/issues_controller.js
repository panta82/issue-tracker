const Joi = require('joi');

const {mongooseToSwagger, objectIdValidator} = require('../lib/validation');
const {issueValidator} = require('../entities/issues');
const API_PREFIX = require('../entities/consts').API_PREFIX;

/**
 * @param {App} app
 */
function issuesController(app) {
	app.server.use(API_PREFIX + '/issues', app.auth.middleware);
	
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
			body: issueValidator
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
			body: issueValidator,
			response: mongooseToSwagger(app.Issue)
		},
		req => {
			return app.issueManager.updateIssue(req.data.params.id, req.data.body);
		}
	);
}

module.exports = issuesController;