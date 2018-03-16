const lodash = require('lodash');

const NODE_ENVS = {
	development: 'development',
	production: 'production',
	test: 'test',
};

const DEFAULT_NODE_ENV = NODE_ENVS.development;

/**
 * Well defined and mockable representation of node's global process variable
 */
class Environment {
	constructor(source) {
		this.node_env = null;
		this.version = null;
		this.name = null;
		this.description = null;
		this.argv = null;
		
		lodash.merge(this, source);
		
		// We must always have a valid node_env
		this.node_env = NODE_ENVS[this.node_env] || DEFAULT_NODE_ENV;
	}
	
	/**
	 * Create instance of Environment from process and package.json
	 * @return {Environment}
	 */
	static loadSync() {
		const result = new Environment();
		
		result.node_env = process.env.NODE_ENV || DEFAULT_NODE_ENV;
		result.argv = process.argv;
		
		const packageInfo = require('../package');
		
		result.version = packageInfo.version;
		result.name = packageInfo.name;
		result.description = packageInfo.description;
		
		return result;
	}
}

module.exports = {
	NODE_ENVS,
	Environment
};