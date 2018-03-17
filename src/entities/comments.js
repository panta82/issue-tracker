const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Joi = require('joi');

const MODELS = require('./consts').MODELS;

class Comment extends mongoose.Model {}

/** @type Comment */
const COMMENT = /** @lends Comment.prototype */ {
	_id: '_id',
	issue: 'issue',
	content: 'content',
	author: 'author',
	created_at: 'created_at',
	updated_at: 'updated_at',
	deleted_at: 'deleted_at',
};

const commentSchema = mongoose.Schema({
	[COMMENT.issue]: {
		type: mongoose.Schema.Types.ObjectId,
		ref: MODELS.Issue,
		required: true
	},
	[COMMENT.content]: {
		type: String,
		required: true
	},
	[COMMENT.author]: {
		type: mongoose.Schema.Types.ObjectId,
		ref: MODELS.User,
		required: true
	},
	[COMMENT.deleted_at]: {
		type: Date
	},
}, {
	timestamps: {
		createdAt: COMMENT.created_at,
		updatedAt: COMMENT.updated_at
	}
});

commentSchema.plugin(mongoosePaginate);

// *********************************************************************************************************************

const commentValidator = {
	content: Joi.string().required()
};

// *********************************************************************************************************************

module.exports = {
	COMMENT,
	
	commentSchema,
	
	commentValidator,
	
	/**
	 * @returns {function(new:Comment)|Model<Comment>}
	 */
	createCommentModel: mongoose => mongoose.model(MODELS.Comment, commentSchema)
};