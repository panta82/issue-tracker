const Joi = require('joi');

const ISSUE = require('../entities/issues').ISSUE;
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
				[ISSUE.title]: Joi.string().max(200),
				[ISSUE.content]: Joi.string()
			}
		},
		req => {
			return app.issueManager.createIssue(req.user, req.data);
		}
	);
}

module.exports = issuesController;