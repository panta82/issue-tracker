const lodash = require('lodash');

class AppOptions {
	constructor(source) {
		lodash.assign(this, source);
	}
}

function App(options) {
	options = new AppOptions(options);
	
	Object.assign(this, /** @lends App.prototype */ {
		start
	});
	
	function start() {
	
	}
}

module.exports = {
	App
};