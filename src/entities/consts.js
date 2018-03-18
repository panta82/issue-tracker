const API_PREFIX  = '/api/v1';

const MODELS = {
	User: 'User',
	Issue: 'Issue',
	Comment: 'Comment',
	Document: 'Document',
};

const APP_COMMANDS = {
	/**
	 * Start application in REPL mode. The operations will be halted. The app will allow user
	 * to interact with services. Once user exits, the app will shut down
	 */
	repl: 'repl',
	
	/**
	 * Ensure indexes and exit the app
	 */
	indexes: 'indexes'
};

module.exports = {
	API_PREFIX,
	APP_COMMANDS,
	MODELS
};