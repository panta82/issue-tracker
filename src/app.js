const lodash = require('lodash');
const mongoose = require('mongoose');

const {APP_COMMANDS} = require('./entities/consts');

const {Logger} = require('./lib/logger');
const {Server} = require('./lib/server');
const {UserManager} = require('./services/user_manager');
const {AuthManager} = require('./services/auth_manager');
const {IssueManager} = require('./services/issue_manager');

const {createUserModel} = require('./entities/users');
const {createIssueModel} = require('./entities/issues');
const {createCommentModel} = require('./entities/comments');

const authController = require('./web/auth_controller');
const issuesController = require('./web/issues_controller');

const ABORT_SIGNAL = 'ABORT_SIGNAL';

class AppSettings {
	constructor(source) {
		/**
		 * One of APP_COMMANDS. Each one of these will trigger a separate special operation and exit.
		 * @type {string}
		 */
		this.command = null;
		
		/** @type {LoggerOptions} */
		this.Logger = {};
		
		/** @type {AuthManagerOptions} */
		this.Auth = {};
		
		/** @type {UserManagerOptions} */
		this.UserManager = {};
		
		/** @type {IssueManagerOptions} */
		this.IssueManager = {};
		
		/** @type {ServerOptions} */
		this.Server = {};
		
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
 * @param {Environment} env
 */
function App(settings, env) {
	const thisApp = this;
	
	settings = new AppSettings(settings);
	
	/** @type {Model[]} */
	thisApp.models = [];
	
	initContainer();
	
	Object.assign(this, /** @lends App.prototype */ {
		start,
		stop,
		ensureAllIndexes
	});
	
	/**
	 * Utility to register a model inline
	 * @param model
	 * @return {Model}
	 */
	function registerModel(model) {
		thisApp.models.push(model);
		return model;
	}
	
	/**
	 * Create all models and services and attach them to app / service container. This is called during creation.
	 */
	function initContainer() {
		/** @type AppSettings */
		thisApp.settings = settings;
		
		/** @type Environment */
		thisApp.env = env;
		
		/** @type {Logger} */
		thisApp.logger = new Logger(settings.Logger);
		
		/** @type {Mongoose|*} */
		thisApp.mongoose = new mongoose.Mongoose();
		
		// Models
		
		/** @type {function(new:User)|Model<User>} */
		thisApp.User = registerModel(createUserModel(thisApp.mongoose));
		
		/** @type {function(new:Issue)|Model<Issue>} */
		thisApp.Issue = registerModel(createIssueModel(thisApp.mongoose));
		
		/** @type {function(new:Comment)|Model<Comment>} */
		thisApp.Comment = registerModel(createCommentModel(thisApp.mongoose));
		
		// Services
		
		/** @type {Server} */
		thisApp.server = new Server({
			...settings.Server,
			api_docs: {
				title: env.name,
				version: env.version,
				description: env.description
			}
		}, thisApp);
		
		/** @type UserManager */
		thisApp.userManager = new UserManager(settings.UserManager, thisApp);
		
		/** @type IssueManager */
		thisApp.issueManager = new IssueManager(settings.IssueManager, thisApp);
		
		/** @type AuthManager */
		thisApp.auth = new AuthManager(settings.Auth, thisApp);
		thisApp.auth.init();
		
		// Controllers
		
		authController(thisApp);
		issuesController(thisApp);
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
				if (settings.command !== APP_COMMANDS.indexes) {
					return;
				}
				
				// Execute the indexing command and exit
				return ensureAllIndexes()
					.then(stop)
					.then(() => {
						throw ABORT_SIGNAL;
					});
			})
			.then(() => {
				return thisApp.server.start();
			})
			.then(() => {
				this.logger.info(`App has started`);
				
				if (settings.command === APP_COMMANDS.repl) {
					enterREPL();
				}
			});
	}
	
	/**
	 * Stop the app. Services are shut down.
	 * @return {Promise<any>}
	 */
	function stop(reason = '') {
		const reasonMsg = reason
			? `Stopping app due to ${reason}`
			: `Stopping app`;
		thisApp.logger.info(reasonMsg);
		
		return thisApp.server.stop()
			.then(() => {
				return thisApp.mongoose.disconnect();
			})
			.then(() => {
				thisApp.logger.info(`App has been stopped`);
			});
	}
	
	/**
	 * Ensure indexes for all registered models. This could cause performance issues in production, use carefully
	 * @param [index]
	 */
	function ensureAllIndexes(index = 0) {
		if (index === 0) {
			thisApp.logger.info(`Ensuring indexes on ${thisApp.models.length} models`);
		}
		
		if (index >= thisApp.models.length) {
			thisApp.logger.info(`Model indexing done`);
			return;
		}
		
		const model = thisApp.models[index];
		thisApp.logger.info(`Ensuring indexes for ${model.modelName}...`);
		
		return model.ensureIndexes().then(() => {
			return ensureAllIndexes(index + 1);
		});
	}
	
	function enterREPL() {
		const libREPL = require('repl');
		
		const repl = libREPL.start('REPL> ');
		repl.context.app = thisApp;
		repl.underscoreAssigned = true;
		
		/**
		 * Logger
		 */
		repl.context.$l = console.log;
		
		/**
		 * Error handler
		 */
		repl.context.$e = thisApp.logger.errorHandler;
		
		/**
		 * Promise wrapper. You can use it like $p(promise). The result will appear and global "_",
		 * error as "_error".
		 * Note: This is a bit goofy, but the best that can be done on short notice.
		 * TODO: Work out a better REPL wrapper module to handle promises decently. The existing modules suck.
		 * @param promise
		 */
		repl.context.$p = function (promise) {
			promise.then(
				res => {
					repl.context._ = res;
					repl.emit('line', '_\n');
				},
				err => {
					repl.context._error = err;
					repl.emit('line', '_error\n');
				}
			);
		};
		
		repl.on('exit', () => {
			stop(`REPL exit`);
		})
	}
}

module.exports = {
	ABORT_SIGNAL,
	
	App,
};