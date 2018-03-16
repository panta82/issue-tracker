const bcrypt = require('bcrypt');

const USER = require('../entities/users').USER;

/**
 * @param options
 * @param {App} deps
 */
function UserManager(options, deps) {
	const log = deps.logger.prefixed('UserManager');

	Object.assign(this, /** @lends UserManager.prototype */ {
		getUserByUsername,
		verifyPassword
	});
	
	/**
	 * Gets user or null
	 * @param username
	 * @return {Promise<User|null>}
	 */
	function getUserByUsername(username) {
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
		return getUserByUsername(username).then(user => {
			if (!user) {
				return false;
			}
			return bcrypt.compare(password, user.password_hash);
		});
	}
}

// *********************************************************************************************************************

module.exports = {
	UserManager
};