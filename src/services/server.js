const libHttp = require('http');
const libPath = require('path');
const {promisify} = require('util');

const libExpress = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const lodash = require('lodash');

const DEFAULT_PORT = 3000;

class ServerOptions {
	constructor(source) {
		/**
		 * Port to listen on
		 * @type {number}
		 */
		this.port = DEFAULT_PORT;
		
		/**
		 * Return 500 errors to clients
		 **/
		this.internal_errors = true;
		
		/**
		 * Report stack traces
		 **/
		this.stack_traces = true;
		
		/**
		 * Handle letsencrypt verification
		 * @type {{enabled: boolean, directory: string}}
		 */
		this.lets_encrypt = {
			enabled: true,
			directory: '/tmp/letsencrypt',
		};
		
		lodash.merge(this, source);
	}
}

/**
 * Web server based on express.
 * It should be used like this:
 * 1. Create Server instance. Server will prepare all the midlewares that should run BEFORE most endpoint handlers
 * 2. Other parts of app attach their handlers and/or middlewares
 * 3. Call start() method. This will attach all the remaining handlers (error & catch all).
 * 4. When app is shutting down, call stop()
 *
 * @param {ServerOptions} options
 * @param {App} app
 * @constructor
 */
function Server(options, app) {
	const thisServer = this;
	
	options = new ServerOptions(options);
	
	const _log = app.logger.prefixed('Server');
	const _express = libExpress();
	/** @type {http.Server|Server} */
	let _server = null;
	
	Object.assign(this, /** @lends Server.prototype */ {
		get: bindMethod('get'),
		put: bindMethod('put'),
		post: bindMethod('post'),
		delete: bindMethod('delete'),
		use: bindMethod('use'),
		
		start,
		stop
	});

	thisServer.use(cors());
	thisServer.use(bodyParser.json());
	thisServer.use(requestLogger);
	
	if (options.lets_encrypt && options.lets_encrypt.enabled) {
		thisServer.use('/.well-known/acme-challenge/', libExpress.static(
			libPath.resolve(options.lets_encrypt.directory, './.well-known/acme-challenge/')
		));
	}
	
	function bindMethod(name) {
		return function () {
			_log.trace1(name, arguments);

			const controllerFn = arguments[arguments.length - 1];
			
			if (name !== 'use' && lodash.isFunction(controllerFn) && controllerFn.length <= 1) {
				// Add promise handler if function signature only takes a single argument
				arguments[arguments.length - 1] = function promiseWrapper(req, res, next) {
					let promise;
					try {
						promise = controllerFn(req);
					}
					catch(err) {
						return next(err);
					}

					if (!(promise instanceof Promise)) {
						return res.send(promise);
					}

					return promise.then(
						result => {
							res.send(result);
						},
						err => {
							next(err);
						}
					);
				};
			}

			return _express[name].apply(_express, arguments);
		};
	}

	function requestLogger(req, res, next) {
		_log.verbose(`${req.method} ${req.url}`);
		next();
	}
	
	function errorHandler(err, req, res, next) {
		if (!err.code) {
			if (err.name.indexOf('ValidationError') >= 0) {
				err.code = 400;
			} else {
				err.code = 500;
			}
		}
		
		if (err.code >= 500) {
			_log.error(err);
		} else {
			_log.warn(`[${err.name ? (err.name + ' ') : ''}${err.code}] ${err.message}`);
		}
		
		res.status(err.code);
		
		const error = {
			message: err.message
		};
		Object.assign(error, err);
		
		if (!options.internal_errors && err.code >= 500) {
			error.message = 'Internal server error';
		}
		if (options.stack_traces) {
			error.stack = err.stack;
		}
		
		res.send({error});
	}
	
	function catchAll(req, res, next) {
		return next({
			message: `Endpoint not found (${req.method} ${req.url})`,
			code: 404
		});
	}
	
	/**
	 * After all middlewares and handlers are attached, this will start the api and begin serving requests
	 * @return {Promise<any>}
	 */
	function start() {
		if (_server) {
			throw new Error(`Server is already running`);
		}
		
		_log.info(`Starting server...`);
		
		return new Promise((resolve, reject) => {
			thisServer.use(catchAll);
			thisServer.use(errorHandler);
			
			_server = libHttp.createServer(_express);

			_server.once('error', reject);

			_server.listen(options.port, () => {
				_server.removeListener('error', reject);
				
				_log.info(`Server is listening on port ${options.port}`);
				
				resolve(options.port);
			});
		});
	}
	
	/**
	 * Call to stop the api. The call will wait for all existing connections to close.
	 * TODO: Should we add a timeout or just outright kill existing connections?
	 * @return {Promise<any>}
	 */
	function stop() {
		_log.info(`Stopping server...`);
		
		if (!_server) {
			throw new Error(`Server is not running`);
		}
		
		const close = promisify(_server.close.bind(_server));
		return close().then(() => {
			_log.info(`Server stopped`);
		})
	}
}

module.exports = {
	DEFAULT_PORT,
	
	Server
};