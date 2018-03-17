const Joi = require('joi');

const API_PREFIX = require('../entities/consts').API_PREFIX;

/**
 * @param {App} app
 */
function authController(app) {
	app.server.post(
		API_PREFIX + '/login',
		`Log in anonymous user`,
		{
			body: {
				username: Joi.string().required(),
				password: Joi.string().required()
			},
			auth: false
		},
		req => {
			return app.auth.login(req.data.username, req.data.password);
		}
	);
}

module.exports = authController;