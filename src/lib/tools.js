const libUtil = require('util');

const doMongooseToSwagger = require('mongoose-to-swagger');
const lodash = require('lodash');

/**
 * Convert hash keys to values and vice versa
 * @param hash
 */
function reverseHash(hash) {
	const result = {};
	for (let key in hash) {
		if (hash.hasOwnProperty(key)) {
			result[hash[key]] = key;
		}
	}
	return result;
}

/**
 * Like inspect, only returns single line string. Useful for logging.
 */
function inspectCompact(arg) {
	if (arg instanceof Error) {
		return `{${String(arg)}}`;
	}
	
	if (arg instanceof RegExp) {
		return arg.toString();
	}
	
	if (arg instanceof Date) {
		return arg.toISOString();
	}
	
	if (lodash.isArray(arg)) {
		return `[Array length=${arg.length}]`;
	}
	
	if (lodash.isObject(arg)) {
		let props = [];
		
		ID_PROPERTIES.forEach(function (idProp) {
			if (arg[idProp]) {
				props.push(`${idProp}=${String(arg[idProp])}`);
			}
		});
		
		let name = arg.constructor.name;
		if (name === 'Object') {
			name = 'Hash';
		}
		
		if (props.length) {
			return '{' + name + ': ' + props.join(' ') + '}';
		}
		return '{' + name + '}';
	}
	
	if (lodash.isString(arg) && arg.length >= STRING_CUTOFF) {
		arg = arg.slice(0, STRING_CUTOFF - 3) + '...';
	}
	
	return libUtil.inspect(arg, INSPECT_OPTIONS);
}
const ID_PROPERTIES = ['id', 'name', 'title'];
const INSPECT_OPTIONS = {depth: 1};
const STRING_CUTOFF = 250;

/**
 * Convert mongoose schema graph into a swagger def using mongooseToSwagger from npm.
 * This exist to make it easier to make recursive schemas (eg. Issue contains User) without being super-annoying.
 * The schema should look like this:
 * {
 *   _: Model1,
 *   key: {
 *     _: Submodel
 *   }
 * }
 */
function mongooseToSwagger(schemaGraph) {
	if (!lodash.isPlainObject(schemaGraph)) {
		// This is already a model, special treatment
		return doMongooseToSwagger(schemaGraph);
	}
	
	if (!schemaGraph._) {
		throw new Error(`Invalid schema graph, lacks "_" property: ${JSON.stringify(schemaGraph)}`);
	}
	
	const result = doMongooseToSwagger(schemaGraph._);
	
	for (let key in schemaGraph) {
		if (!schemaGraph.hasOwnProperty(key) || key === '_') {
			continue;
		}
		
		result.properties[key] = mongooseToSwagger(schemaGraph[key]);
	}
	
	return result;
}

module.exports = {
	reverseHash,
	inspectCompact,
	mongooseToSwagger
};