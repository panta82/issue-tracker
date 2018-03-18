const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const MODELS = require('./consts').MODELS;

class Document extends mongoose.Model {}

/** @type Document */
const DOCUMENT = /** @lends Document.prototype */ {
	_id: '_id',
	issue: 'issue',
	uploader: 'uploader',
	filename: 'filename',
	bucket: 'bucket',
	extension: 'extension',
	created_at: 'created_at',
	updated_at: 'updated_at',
	deleted_at: 'deleted_at',
};

const documentSchema = mongoose.Schema({
	[DOCUMENT.issue]: {
		type: mongoose.Schema.Types.ObjectId,
		ref: MODELS.Issue,
		required: true
	},
	[DOCUMENT.uploader]: {
		type: mongoose.Schema.Types.ObjectId,
		ref: MODELS.User,
		required: true
	},
	[DOCUMENT.filename]: {
		type: String,
		required: true
	},
	[DOCUMENT.extension]: {
		type: String,
	},
	[DOCUMENT.bucket]: {
		type: String,
		required: true,
	},
	[DOCUMENT.deleted_at]: {
		type: Date
	},
}, {
	timestamps: {
		createdAt: DOCUMENT.created_at,
		updatedAt: DOCUMENT.updated_at
	}
});

documentSchema.plugin(mongoosePaginate);

// *********************************************************************************************************************

module.exports = {
	DOCUMENT,
	
	documentSchema,
	
	/**
	 * @returns {function(new:Document)|Model<Document>}
	 */
	createDocumentModel: mongoose => mongoose.model(MODELS.Document, documentSchema)
};