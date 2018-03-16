const lodash = require("lodash");
const passport = require('passport');
const passportJwt = require('passport-jwt');
const libJwt = require('jsonwebtoken');
const Joi = require('joi');

class AuthManagerOptions {
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
 * @param {AuthManagerOptions} options
 * @param {App} deps
 */
function AuthManager(options, deps) {
	options = new AuthManagerOptions(options);
	
	const log = deps.logger.prefixed('Auth');
	
	if (!options.secret) {
		throw new Error(`You must configure "Auth.secret" in order to initialize AuthManager. Best generate some random long string and keep it secure!`);
	}
	
	Object.assign(this, /** @lends AuthManager.prototype */ {
		init,
		login,
		middleware: passport.authenticate('jwt', {session: false})
	});
	
	/**
	 * Initializes passport strategies. This should be called during the construction phase
 	 */
	function init() {
		log.trace1(init);
		
		deps.server.use(passport.initialize());
		
		const strategyOpts = {
			secretOrKey: options.secret,
			issuer: options.token_issuer,
			jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken()
		};
		
		const strategy = new passportJwt.Strategy(strategyOpts, (/** JwtPayload */ jwtPayload, next) => {
			return deps.userManager.getUserByUsername(jwtPayload.username).then(
				user => {
					if (!user) {
						return next(null, false);
					}
					
					return next(null, user);
				},
				err => next(err)
			);
		});
		
		passport.use(strategy);
	}
	
	/**
	 * Login user using password. Returns Principal
	 * @param username
	 * @param password
	 * @return {Promise<{message, token}>}
	 */
	function login(username, password) {
		log.trace1(init, arguments);
		
		return deps.userManager.verifyPassword(username, password).then(valid => {
			if (!valid) {
				throw {
					message: 'Invalid username or password',
					code: 401
				};
			}
			
			log.info(`User ${username} has logged in`);
			const payload = Object.assign({}, new JwtPayload(username));
			const token = libJwt.sign(payload, options.secret, {
				issuer: options.token_issuer,
			});
			
			return {
				message: 'Authenticated',
				token
			};
		});
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
	AuthManager,
	JwtPayload
};