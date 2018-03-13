const libREPL = require('repl');

const lodash = require('lodash');
const mongoose = require('mongoose');

const {createUserModel} = require('./entities/users');

class AppSettings {
	constructor(source) {
		/**
		 * Start application in REPL mode. The operations will be halted. The app will allow user
		 * to interact with services. Once user exits, the app will shut down.
		 * @type {boolean}
		 */
		this.repl = false;
		
		this.Mongo = {
			/**
			 * Mongo connection string. See http://mongoosejs.com/docs/connections.html
			 */
			connection_string: 'mongodb://localhost/issue_tracker'
		};
		
		lodash.merge(this, source);
	}
}

function App(settings) {
	const thisApp = this;
	
	settings = new AppSettings(settings);
	
	/**
	 * @type {Mongoose|*}
	 */
	this.mongoose = new mongoose.Mongoose();
	
	/**
	 * @type {function(new:User)|Model}
	 */
	this.User = createUserModel(this.mongoose);
	
	Object.assign(this, /** @lends App.prototype */ {
		start,
		stop
	});
	
	function start() {
		return thisApp.mongoose
			.connect(settings.Mongo.connection_string, {
				 // Not needed, since we have well established startup sequence
				bufferCommands: false,
				
				// We will dogfood the same code for creating production indexes instead of this
				autoIndex: false
			})
			.then(() => {
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
	
	function stop(reason) {
		return thisApp.mongoose.disconnect()
			.then(() => {
				const reasonMsg = reason
					? `Stopped due to ${reason}`
					: `Stopped`;
				console.log(reasonMsg);
			});
	}
}

module.exports = {
	App
};