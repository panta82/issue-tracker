const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Joi = require('joi');

const MODELS = require('./consts').MODELS;

const ISSUE_TITLE_MAX_LENGTH = 200;

class Issue extends mongoose.Model {}

/** @type Issue */
const ISSUE = /** @lends Issue.prototype */ {
	_id: '_id',
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
		required: true,
		maxlength: ISSUE_TITLE_MAX_LENGTH
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

issueSchema.plugin(mongoosePaginate);

// *********************************************************************************************************************

const issueValidator = {
	[ISSUE.title]: Joi.string().max(ISSUE_TITLE_MAX_LENGTH),
	[ISSUE.content]: Joi.string()
};

// *********************************************************************************************************************

module.exports = {
	ISSUE,
	ISSUE_TITLE_MAX_LENGTH,
	
	issueSchema,
	
	issueValidator,
	
	/**
	 * @returns {function(new:Issue)|Model<Issue>}
	 */
	createIssueModel: mongoose => mongoose.model(MODELS.Issue, issueSchema)
};