const lodash = require('lodash');
const doMongooseToSwagger = require('mongoose-to-swagger');
const Joi = require('joi');

// *********************************************************************************************************************

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

// *********************************************************************************************************************

const objectIdValidator = Joi.string().required().regex(/^[0-9a-fA-F]{24}$/, 'Mongo ObjectId');

// *********************************************************************************************************************

module.exports = {
	mongooseToSwagger,
	
	objectIdValidator
};