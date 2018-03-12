const mongoose = require('mongoose');

const USER_TYPE = 'User';

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

module.exports = {
	USER_TYPE,
	USER,
	userSchema,
	
	/**
	 * @param mongoose
	 * @return {}
	 */
	createUserModel: (mongoose) => mongoose.model(USER_TYPE, userSchema)
};