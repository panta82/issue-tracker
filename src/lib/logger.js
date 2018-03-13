const libWinston = require('winston');
const lodash = require('lodash');

const {reverseHash, inspectCompact} = require("./tools");

const LOGGER_LEVELS = {
	error: 'error',
	warn: 'warn',
	info: 'info',
	verbose: 'verbose',
	debug: 'debug',
	silly: 'silly'
};

const LOGGER_LEVEL_VALUES = {
	error: 0,
	warn: 1,
	info: 2,
	verbose: 3,
	debug: 4,
	silly: 5
};

const LOGGER_LEVEL_VALUES_TO_LEVELS = reverseHash(LOGGER_LEVEL_VALUES);

class LoggerOptions {
	constructor(source) {
		/**
		 * One of LOGGER_LEVELS
		 */
		this.level = LOGGER_LEVELS.info;
		
		/**
		 * Prefix to use for each logged message
		 */
		this.prefix = '';
		
		/**
		 * Level to use for trace1 calls
		 * @type {string}
		 */
		this.trace1_level = LOGGER_LEVELS.verbose;
		
		/**
		 * Level to use for trace2 calls
		 * @type {string}
		 */
		this.trace2_level = LOGGER_LEVELS.debug;
		
		/**
		 * Attach as global exception handler. If false, exceptions will crash the app (do we want that?)
		 * @type {boolean}
		 */
		this.handle_exceptions = true;
		
		lodash.merge(this, source);
		
		this.level = LOGGER_LEVEL_VALUES_TO_LEVELS[this.level] || this.level;
	}
}

/**
 * @param {LoggerOptions} options
 * @constructor
 */
function Logger(options) {
	const thisLogger = this;
	
	options = new LoggerOptions(options);
	
	const _logger = new libWinston.Logger({
		transports: [
			new libWinston.transports.Console({
				level: LOGGER_LEVELS[options.level] || options.level,
				handleExceptions: options.handle_exceptions,
				colorize: true,
				timestamp: true
			})
		]
	});
	
	Object.assign(thisLogger, /** @lends Logger.prototype*/ {
		log,
		error: log.bind(thisLogger, LOGGER_LEVELS.error),
		warn: log.bind(thisLogger, LOGGER_LEVELS.warn),
		info: log.bind(thisLogger, LOGGER_LEVELS.info),
		verbose: log.bind(thisLogger, LOGGER_LEVELS.verbose),
		debug: log.bind(thisLogger, LOGGER_LEVELS.debug),
		silly: log.bind(thisLogger, LOGGER_LEVELS.silly),
		prefixed,
		errorHandler,
		trace1,
		trace2
	});
	
	function log(level, message, ...args) {
		if (LOGGER_LEVEL_VALUES[level] > options.level) {
			return;
		}
		
		if (message instanceof Error) {
			if (message.logged) {
				// Prevent logging the same error multiple times
				return;
			}
			message.logged = true;
			
			if (level === LOGGER_LEVELS.error) {
				args.unshift(Object.assign({
					stack: message.stack
				}, message));
			}
			
			message = message.toString();
		}
		else if (lodash.isFunction(message)) {
			message = `[TRACE] ${message.name || '<anon fn>'}`;
		}
		
		if (options.prefix) {
			message = `[${options.prefix}] ${message}`;
		}
		
		_logger.log(level, message, ...args);
	}
	
	/**
	 * @param {string} prefix
	 * @return {Logger}
	 */
	function prefixed(prefix) {
		const cloneOptions = lodash.merge({}, options, {
			prefix: options.prefix
				? `${options.prefix} > ${prefix}`
				: prefix,
			handle_exceptions: false
		});
		return new Logger(cloneOptions);
	}
	
	function errorHandler(err) {
		if (!err) {
			return;
		}
		
		log(LOGGER_LEVELS.error, err);
	}
	
	function doTrace(fn, args, level, prefix) {
		if (lodash.isFunction(fn)) {
			fn = fn.name;
		}
		
		if (!fn) {
			fn = 'anonymous';
		}
		
		let argsStr = '('
			+ Array.prototype
				.map.call(args, inspectCompact)
				.join(', ')
			+ ')';
		
		return log(level, '[' + prefix + '] ' + fn + argsStr);
	}
	
	function trace1(fn, args) {
		return doTrace(fn, args, options.trace1_level, 'TRACE1');
	}
	
	function trace2(fn, args) {
		return doTrace(fn, args, options.trace2_level, 'TRACE2');
	}
}

module.exports = {
	LOGGER_LEVELS,
	LOGGER_LEVEL_VALUES,
	
	Logger
};
