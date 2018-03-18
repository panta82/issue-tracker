const {mongooseToSwagger, objectIdValidator} = require('../lib/validation');
const API_PREFIX = require('../entities/consts').API_PREFIX;

/**
 * @param {App} app
 */
function documentsController(app) {
	app.server.use(API_PREFIX + '/documents', app.auth.middleware);
	
	app.server.post(
		API_PREFIX + '/issues/:id/documents',
		`Upload a document, to be attached with an issue`,
		{
			params: {
				id: objectIdValidator
			},
			response: mongooseToSwagger(app.Document)
		},
		req => {
			return app.documentStore.uploadDocument(req.user, req.data.params.id, req);
		}
	);
	
	app.server.get(
		API_PREFIX + '/issues/:id/documents',
		`List documents for an issues, with pagination.`,
		{
			params: {
				id: objectIdValidator
			},
			response: mongooseToSwagger({
				_: app.Document,
				uploader: app.User
			}),
			paginated: true
		},
		req => {
			return app.documentStore.listDocumentsForIssue(req.data.params.id, req.data.query.page, req.data.query.page_size);
		}
	);
	
	app.server.get(
		API_PREFIX + '/documents/:id/download',
		`Download a document file`,
		{
			params: {
				id: objectIdValidator
			},
		},
		(req, res, next) => {
			app.documentStore.prepareDocumentDownload(req.data.params.id).then(
				download => {
					download.send(res);
				},
				err => {
					next(err);
				}
			);
		}
	);
}

module.exports = documentsController;