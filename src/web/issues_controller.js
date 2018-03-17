const Joi = require('joi');

const {mongooseToSwagger} = require('../lib/tools');
const libIssues = require('../entities/issues');
const API_PREFIX = require('../entities/consts').API_PREFIX;

/**
 * @param {App} app
 */
function issuesController(app) {
	app.server.use(API_PREFIX + '/issues', app.auth.middleware);
	
	app.server.post(
		API_PREFIX + '/issues',
		`Create new issue`,
		{
			body: {
				[libIssues.ISSUE.title]: Joi.string().max(libIssues.ISSUE_TITLE_MAX_LENGTH),
				[libIssues.ISSUE.content]: Joi.string()
			}
		},
		req => {
			return app.issueManager.createIssue(req.user, req.data);
		}
	);
	
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
			return app.issueManager.listIssues(req.data.page, req.data.page_size);
		}
	);
}

module.exports = issuesController;