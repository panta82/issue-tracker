const mongoose = require('mongoose');

const MODELS = require('./consts').MODELS;

class Issue extends mongoose.Model {}

/** @type Issue */
const ISSUE = /** @lends Issue.prototype */ {
	title: 'title',
	content: 'content',
	author: 'author',
	created_at: 'created_at',
	updated_at: 'updated_at',
	deleted_at: 'deleted_at',
};

const issueSchema = mongoose.Schema({
	[ISSUE.title]: {
		type: String,
		required: true
	},
	[ISSUE.content]: {
		type: String
	},
	[ISSUE.author]: {
		type: mongoose.Schema.Types.ObjectId,
		ref: MODELS.User,
		required: true
	},
	[ISSUE.deleted_at]: {
		type: Date
	},
}, {
	timestamps: {
		createdAt: ISSUE.created_at,
		updatedAt: ISSUE.updated_at
	}
});

// *********************************************************************************************************************

module.exports = {
	ISSUE,
	
	issueSchema,
	
	/**
	 * @returns {function(new:Issue)|Model|Schema}
	 */
	createIssueModel: mongoose => mongoose.model(MODELS.Issue, issueSchema)
};