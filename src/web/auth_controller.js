const lodash = require("lodash");
const passport = require('passport');
const passportJwt = require('passport-jwt');
const libJwt = require('jsonwebtoken');
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
			}
		},
		req => {
			return 'Logged in';
		}
	);
}

module.exports = authController;