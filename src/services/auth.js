const lodash = require("lodash");
const passport = require('passport');
const passportJwt = require('passport-jwt');
const libJwt = require('jsonwebtoken');
const Joi = require('joi');

class AuthOptions {
	constructor(source) {
		/**
		 * This should be something pretty unique, for 2-way encryption. Must be configured.
		 * @type {string}
		 */
		this.secret = null;
		
		this.token_issuer = 'pantas.net/issue-tracker';
		
		lodash.merge(this, source);
	}
}

/**
 * @param {AuthOptions} options
 * @param {App} deps
 */
function AuthManager(options, deps) {
	options = new AuthOptions(options);
	
	const log = deps.logger.prefixed('Auth');
	
	if (!options.secret) {
		throw new Error(`You must configure AuthManager.secret in order to run. Best generate some random long string and keep it secure!`);
	}
	
	Object.assign(this, /** @lends AuthManager.prototype */ {
		init,
		middleware: passport.authenticate('jwt', {session: false})
	});
	
	function init() {
		deps.server.use(passport.initialize());
		
		const strategyOpts = {
			secretOrKey: options.secret,
			issuer: options.token_issuer,
			jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken()
		};
		
		const strategy = new passportJwt.Strategy(strategyOpts, (/** JwtPayload */ jwtPayload, next) => {
			const user = getUserByUsername(jwtPayload.username);
			if (!user) {
				return next(null, false);
			}
			
			return next(null, user);
		});
		
		passport.use(strategy);
		
		deps.server.post(
			API_PREFIX + '/login',
			`Login user`,
			{
				body: {
					username: V.string().required(),
					password: V.string().required()
				}
			},
			(req) => {
				const user = getUserByUsername(req.data.username);
				if (!user || user.password !== req.data.password) {
					log.warn(`Failed login using: ${JSON.stringify(req.data)}`);
					throw {
						message: 'Invalid username or password',
						code: 401
					};
				}
				
				log.info(`User ${user.username} has logged in`);
				const payload = Object.assign({}, new JwtPayload(req.data.username));
				const token = libJwt.sign(payload, options.secret, {
					issuer: options.token_issuer,
				});
				return {
					message: 'Authenticated',
					principal: {
						token,
						user: lodash.omit(user, ['password'])
					}
				};
			}
		);
	}
}

// *********************************************************************************************************************

class JwtPayload {
	constructor(username) {
		this.username = username;
	}
}

// *********************************************************************************************************************

module.exports = {
	AuthManager
};