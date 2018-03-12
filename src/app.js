const lodash = require('lodash');
const mongoose = require('mongoose');

const {createUserModel} = require('./entities/users');

class AppSettings {
	constructor(source) {
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
		start
	});
	
	function start() {
		return thisApp.mongoose.connect(settings.Mongo.connection_string, {
			 // Not needed, since we have well established startup sequence
			bufferCommands: false,
			
			// We will dogfood the same code for creating production indexes instead of this
			autoIndex: false
		});
	}
}

module.exports = {
	App
};