const libHttp = require('http');
const libPath = require('path');
const {promisify} = require('util');

const Joi = require('joi');
const lodash = require('lodash');
const libExpress = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const joiToSwagger = require('joi-to-swagger');

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
		 * If true, server will auto-add validation middlewares based on provided endpoint definitions.
		 * The validated object will become available under req.data
		 * @type {boolean}
		 */
		this.enable_validation = true;
		
		/**
		 * Serve API docs. Should be enabled in dev
		 */
		this.api_docs = /** @lends ServerOptionsApiDocs.prototype */ {
			enabled: true,
			endpoint: '/docs',
			
			// The following properties should probably be loaded from package
			title: 'Server',
			version: '1.0.0',
			description: 'Server',
			
			// Miscellaneous swagger props
			schemes: [
				'http'
			],
			base_path: '/'
		};
		
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
 * @param {App} deps
 * @constructor
 */
function Server(options, deps) {
	const thisServer = this;
	
	options = new ServerOptions(options);
	
	const _log = deps.logger.prefixed('Server');
	const _express = libExpress();
	/** @type {http.Server|Server} */
	let _server = null;
	
	/** @type Endpoint[] */
	const _endpoints = [];
	
	Object.assign(this, /** @lends Server.prototype */ {
		get: makeEndpointFnForMethod('get'),
		put: makeEndpointFnForMethod('put'),
		post: makeEndpointFnForMethod('post'),
		delete: makeEndpointFnForMethod('delete'),
		use: makeEndpointFnForMethod('use'),
		
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
	
	/**
	 * @param method
	 * @return {function([path], [description], endpoint: Endpoint, ...fn)}
	 */
	function makeEndpointFnForMethod(method) {
		return function () {
			_log.trace1(method, arguments);
			
			if (method === 'use') {
				// Use endpoints (middlewares mostly) don't need special handling
				return _express[method].apply(_express, arguments);
			}
			
			const endpoint = createEndpointFromArgs(method, arguments);
			
			if (options.enable_validation && endpoint.handlers.length) {
				const validationSchema = Joi.object({
					params: Joi.object(endpoint.params),
					query: Joi.object(endpoint.query),
					body: Joi.object(endpoint.body)
				});
				const validator = createValidationMiddleware(validationSchema);
				endpoint.handlers.splice(-1, 0, validator);
			}
			
			// Save endpoint data for later use
			_endpoints.push(endpoint);

			// Pass the params along to express
			if (endpoint.path) {
				return _express[method].call(_express, endpoint.path, ...endpoint.handlers);
			}
			return _express[method].call(_express, ...endpoint.handlers);
			
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
			return Promise.resolve();
		}
		
		_log.info(`Starting server...`);
		
		return new Promise((resolve, reject) => {
			const enableApiDocs = options.api_docs && options.api_docs.enabled;
			
			if (enableApiDocs) {
				const swaggerDocument = createSwaggerDocument(_endpoints, options.api_docs);
				thisServer.use(options.api_docs.endpoint, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
			}
			
			thisServer.use(catchAll);
			thisServer.use(errorHandler);
			
			_server = libHttp.createServer(_express);

			_server.once('error', reject);

			_server.listen(options.port, () => {
				_server.removeListener('error', reject);
				
				_log.info(`Server is listening on port ${options.port}`);
				if (enableApiDocs) {
					_log.info(`Documentation is available at ${options.api_docs.endpoint}`);
				}
				
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
			return Promise.resolve();
		}
		
		const close = promisify(_server.close.bind(_server));
		return close().then(() => {
			_log.info(`Server stopped`);
		})
	}
}

// *********************************************************************************************************************

/**
 * Create endpoint definition from loosely provided args.
 * Also adds validation middleware, if enabled
 * eg. server.get('/blah', 'Blah handler', {query: '...'}, () => {}, () => {})
 * @param method
 * @param args
 * @return Endpoint
 */
function createEndpointFromArgs(method, args) {
	const endpoint = new Endpoint();
	const handlers = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (handlers.length || lodash.isFunction(arg)) {
			// Once we hit a function, we pack up everything else as handlers
			handlers.push(arg);
			continue;
		}
		
		// String is treated as path or description
		if (lodash.isString(arg)) {
			if (endpoint.path === null) {
				endpoint.path = arg;
			}
			else if (endpoint.description === null) {
				endpoint.description = arg;
			}
			else {
				throw new Error(`Unexpected string argument: ${arg}`);
			}
			continue;
		}
		
		// Everything else is merged into the endpoint definition object
		lodash.merge(endpoint, arg);
	}
	
	endpoint.method = method;
	
	const handlerFn = handlers[handlers.length - 1];
	if (lodash.isFunction(handlerFn) && handlerFn.length <= 1) {
		// Add promise handler if function signature only takes a single argument (req)
		handlers[handlers.length - 1] = makePromiseWrapper(handlerFn);
	}
	
	endpoint.handlers = handlers;
	
	// Add query params for pagination
	if (endpoint.paginated) {
		endpoint.query = {
			...endpoint.query,
			page: Joi.number().greater(0),
			page_size: Joi.number().greater(0)
		};
	}
	
	return endpoint;
}

/**
 * Create a promise wrapper function for an express request handler.
 * If your handler only takes req and returns the promise, this wrapper will take care of the rest
 * @param handlerFn Your request handler
 * @return {function(req, res, next)}
 */
function makePromiseWrapper(handlerFn) {
	return function promiseWrapper(req, res, next) {
		let promise;
		try {
			promise = handlerFn(req);
		}
		catch(err) {
			return next(err);
		}
		
		// Goofy promise detection. Some modules insist on using Bluebird, so we can't just test for Ctr
		if (!promise || !promise.then) {
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

/**
 * @param schema Joi object schema
 * @return {validator}
 */
function createValidationMiddleware(schema) {
	return function validator(req, res, next) {
		const input = {
			body: req.body,
			query: lodash.mapKeys(req.query, (_, key) => {
				// Convert query values to snake case, so you can use REST-standard kebab case keys for url-s
				return key.replace(/[^a-zA-Z0-9$]/, '_');
			}),
			params: req.params
		};
		
		const result = schema.validate(input, {
			stripUnknown: true,
			abortEarly: false
		});
		
		if (result.error) {
			return next(result.error);
		}
		
		// Package stuff into req.data, using explicit assignments, so intellisense can pick it up
		req.data = {
			body: result.value.body,
			query: result.value.query,
			params: result.value.params
		};
		return next();
		
	};
}

/**
 * Create swagger document from api settings and its collected endpoints
 * TODO: This is incredibly dirty. Refactor into own thing.
 * @param {Endpoint[]} endpoints
 * @param {ServerOptionsApiDocs} apiDocOptions
 */
function createSwaggerDocument(endpoints, apiDocOptions) {
	const result = {
		swagger: '2.0',
		info: {
			version: apiDocOptions.version,
			title: apiDocOptions.title,
			description: apiDocOptions.description,
		},
		schemes: apiDocOptions.schemes,
		paths: {},
	};
	
	if (apiDocOptions.base_path) {
		result.basePath = apiDocOptions.base_path;
	}
	
	endpoints.forEach(endpoint => {
		const doc = {
			summary: endpoint.path,
			description: endpoint.description || null,
			parameters: []
		};
		
		lodash.forEach(endpoint.params, (validator, key) => {
			doc.parameters.push({
				name: key,
				in: 'path',
			});
		});
		
		lodash.forEach(endpoint.query, (validator, key) => {
			doc.parameters.push({
				name: key,
				in: 'query',
			});
		});
		
		if (endpoint.body) {
			doc.parameters.push({
				in: 'body',
				name: 'body',
				schema: joiToSwagger(Joi.object(endpoint.body)).swagger
			});
		}
		
		if (endpoint.response) {
			let schema = endpoint.response;
			if (endpoint.paginated) {
				// Treat response as an array of paginated objects
				schema = {
					type: 'object',
					properties: {
						total: {type: 'integer'},
						page: {type: 'integer'},
						pages: {type: 'integer'},
						limit: {type: 'integer'},
						docs: {
							type: 'array',
							items: schema
						}
					}
				};
			}
			
			doc.responses = {
				'200': {
					description: 'success',
					schema
				}
			};
		}
		
		if (endpoint.auth) {
			doc.parameters.push({
				in: 'header',
				name: 'Authorization',
				description: 'Authorization header',
				required: true,
				type: 'string'
			});
		}
		
		// Replace express-like path placeholders with swagger style. Eg. /:id/ to /{id}/
		// TODO: This won't work for regex paths, revisit if it becomes a problem
		const path = endpoint.path.replace(/:([a-zA-Z0-9_]+)/ig, '{$1}');
		
		result.paths[path] = result.paths[path] || {};
		result.paths[path][endpoint.method] = doc;
	});
	
	return result;
}

// *********************************************************************************************************************

class Endpoint {
	constructor(source) {
		/**
		 * Method to use for endpoint (get/post/put...)
		 * @type {string}
		 */
		this.method = null;
		
		/**
		 * Route path with express-like placeholders. Eg. /api/v1/users/:id/image
		 * @type {string}
		 */
		this.path = null;
		
		/**
		 * Textual description of endpoint
		 * @type {string}
		 */
		this.description = null;
		
		/**
		 * Joi object schema for URL params. They should match placeholders in path
		 * @type {Schema|object}
		 */
		this.params = null;
		
		/**
		 * Joi object schema for query string. Actual values will be converted to snake case
		 * @type {Schema|object}
		 */
		this.query = null;
		
		/**
		 * Joi object schema for request body
		 * @type {Schema|object}
		 */
		this.body = null;
		
		/**
		 * Joi object schema for response
		 * @type {Schema|object}
		 */
		this.response = null;
		
		/**
		 * Whether this endpoint will require authorization header.
		 * @type {boolean}
		 */
		this.auth = true;
		
		/**
		 * Helper to add pagination query params and response wrapping
		 * @type {boolean}
		 */
		this.paginated = false;
		
		/**
		 * List of function handlers for this endpoint. Usually just one
		 * @type {Array}
		 */
		this.handlers = [];
		
		lodash.assign(this, source);
	}
}

// *********************************************************************************************************************

module.exports = {
	DEFAULT_PORT,
	
	Server
};