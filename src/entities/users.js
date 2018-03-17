const mongoose = require('mongoose');

const MODELS = require('./consts').MODELS;

class User extends mongoose.Model {}

/** @type User */
const USER = /** @lends User.prototype */ {
	username: 'username',
	password_hash: 'password_hash',
	created_at: 'created_at',
	updated_at: 'updated_at',
};

const userSchema = mongoose.Schema({
	[USER.username]: {
		type: String,
		required: true,
		index: {unique: true}
	},
	[USER.password_hash]: {
		type: String,
		required: true,
	}
}, {
	timestamps: {
		createdAt: USER.created_at,
		updatedAt: USER.updated_at
	}
});

// *********************************************************************************************************************

module.exports = {
	USER,
	
	userSchema,
	
	/**
	 * @returns {function(new:User)|Model|Schema}
	 */
	createUserModel: mongoose => mongoose.model(MODELS.User, userSchema)
};