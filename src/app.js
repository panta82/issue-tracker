const libREPL = require('repl');

const lodash = require('lodash');
const mongoose = require('mongoose');

const {Logger} = require('./lib/logger');
const {createUserModel} = require('./entities/users');

class AppSettings {
	constructor(source) {
		/**
		 * Start application in REPL mode. The operations will be halted. The app will allow user
		 * to interact with services. Once user exits, the app will shut down.
		 * @type {boolean}
		 */
		this.repl = false;
		
		/**
		 * @type {LoggerOptions}
		 */
		this.Logger = {};
		
		/**
		 * Options for mongoose/mongodb driver
		 */
		this.Mongo = {
			/**
			 * Mongo connection string. See http://mongoosejs.com/docs/connections.html
			 */
			connection_string: 'mongodb://localhost/issue_tracker'
		};
		
		lodash.merge(this, source);
	}
}

/**
 * Main service container for the app. It holds and manages all other services.
 * @param {AppSettings} settings
 */
function App(settings) {
	const thisApp = this;
	
	settings = new AppSettings(settings);
	
	populateContainer();
	
	Object.assign(this, /** @lends App.prototype */ {
		start,
		stop
	});
	
	/**
	 * Create all models and services and attach them to app / service container. This is called during creation.
	 */
	function populateContainer() {
		/**
		 * @type {Logger}
		 */
		thisApp.logger = new Logger(settings.Logger);
		
		/**
		 * @type {Mongoose|*}
		 */
		thisApp.mongoose = new mongoose.Mongoose();
		
		/**
		 * @type {function(new:User)|Model}
		 */
		thisApp.User = createUserModel(thisApp.mongoose);
	}
	
	/**
	 * Start app. All services are initialized in appropriate order (App knows the correct order)
	 * @return {Promise<any>}
	 */
	function start() {
		this.logger.info(`Starting app`);
		
		return thisApp.mongoose
			.connect(settings.Mongo.connection_string, {
				 // Not needed, since we have well established startup sequence
				bufferCommands: false,
				
				// We will dogfood the same code for creating production indexes instead of this
				autoIndex: false
			})
			.then(() => {
				this.logger.info(`App has started`);
				
				if (!settings.repl) {
					return;
				}
				
				// Enter REPL
				const repl = libREPL.start('REPL> ');
				repl.context.app = thisApp;
				repl.on('exit', () => {
					thisApp.stop(`REPL exit`);
				})
			});
	}
	
	/**
	 * Stop the app. Services are shut down.
	 * @return {Promise<any>}
	 */
	function stop(reason) {
		const reasonMsg = reason
			? `Stopping app due to ${reason}`
			: `Stopping app`;
		thisApp.logger.info(reasonMsg);
		
		return thisApp.mongoose.disconnect()
			.then(() => {
				
				thisApp.logger.info(`App has been stopped`);
			});
	}
}

module.exports = {
	App
};