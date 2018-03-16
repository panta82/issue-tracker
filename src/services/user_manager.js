const lodash = require("lodash");
const bcrypt = require('bcrypt');

const CustomError = require('../entities/errors').CustomError;
const USER = require('../entities/users').USER;

class UserManagerOptions {
	constructor(source) {
		/**
		 * The cost of generating salts
		 * @type {number}
		 */
		this.salt_rounds = 5;
		
		lodash.merge(this, source);
	}
}

/**
 * @param options
 * @param {App} deps
 */
function UserManager(options, deps) {
	options = new UserManagerOptions(options);
	
	const log = deps.logger.prefixed('UserManager');

	Object.assign(this, /** @lends UserManager.prototype */ {
		createUser,
		getUserByUsername,
		verifyPassword
	});
	
	/**
	 * Create a new user in the system
	 */
	function createUser(username, password) {
		log.trace2(createUser, arguments);
		
		return bcrypt.hash(password, options.salt_rounds)
			.then(hashedPassword => {
				const user = new deps.User({
					[USER.username]: username,
					[USER.password_hash]: hashedPassword,
				});
				
				return user.save().catch(err => {
					if (err.code === 11000) {
						// Duplicate user error
						// TODO: Is there a better way to detect this?
						err = new DuplicateUsernameError(username);
					}
					throw err;
				});
			});
	}
	
	/**
	 * Gets user or null
	 * @param username
	 * @return {Promise<User|null>}
	 */
	function getUserByUsername(username) {
		log.trace2(getUserByUsername, arguments);
		
		return deps.User.findOne({
			[USER.username]: username
		});
	}
	
	/**
	 * Verifies username and password provided during the login attempt. Returns true/false
	 * @param username
	 * @param password
	 * @return {Promise<boolean>}
	 */
	function verifyPassword(username, password) {
		log.trace2(verifyPassword, arguments);
		
		return getUserByUsername(username).then(user => {
			if (!user) {
				return false;
			}
			return bcrypt.compare(password, user.password_hash);
		});
	}
}

// *********************************************************************************************************************

class DuplicateUsernameError extends CustomError {
	constructor(username) {
		super(`User with username "${username}" alreaday exists`);
		this.code = 400;
	}
}

// *********************************************************************************************************************

module.exports = {
	UserManager
};