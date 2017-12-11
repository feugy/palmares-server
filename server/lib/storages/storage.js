const Joi = require('joi')

const optsSchema = Joi.object({
  name: Joi.string().required(),
  logger: Joi.object().required().description('Bunyan compatible logger')
}).required().unknown().label('opts')

/**
 * Storage is an interface to store and retrieve JSON structures of a given model.
 */
module.exports = class Storage {
  /**
   * @constructor
   * Storage constructor: initialize with configuration
   *
   * @param {Object} opts - provider configuration. Must contains:
   * @param {String} opts.name - the storage name, for error messages
   */
  constructor (opts) {
    // Provider configuration options. @see constructor
    Joi.assert(opts, optsSchema)
    this.opts = opts
  }

  /**
   * @async
   * Add a new model (if id is not set or does not match existing) or erase existing model
   *
   * @param {Object} saved - saved model
   * @returns {Object} saved model
   */
  async save (saved) {
    throw new Error(`${this.opts.name} does not implement "save" feature`)
  }

  /**
   * @async
   * Remove an existing model by its id
   *
   * @param {Object} removed - removed model
   */
  async remove (removed) {
    throw new Error(`${this.opts.name} does not implement "remove" feature`)
  }

  /**
   * @async
   * Get a single model from its id
   *
   * @param {Object} modelClass - model class
   * @param {String} id - searched id
   * @param {Array<String>} [filtered = null] - list of fields to include in response
   * @returns {Object} resolve with retrieved model, or null if no model could be found
   */
  async findById (modelClass, id, filter = null) {
    throw new Error(`${this.opts.name} does not implement "findById" feature`)
  }

  /**
   * @async
   * Get a list of model matching given criteria
   *
   * @param {Object} modelClass - model class
   * @param {Object} criteria - search criteria, (mongo query)
   * @param {Array<String>} [filtered = null] - list of fields to include in response
   * @param {Number} [offset = 0] - offset within entire dataset (0-based) of first result returned
   * @param {Number} [size = 20] - number of result returned
   * @returns {Array<Object>} matching models (may be an empty array)
   */
  async find (modelClass, criteria, filtered = null, offset = 0, size = 20) {
    throw new Error(`${this.opts.name} does not implement "find" feature`)
  }

  /**
   * @async
   * Remove all models
   *
   * @param {Object} modelClass - model class
   */
  async removeAll (model) {
    throw new Error(`${this.opts.name} does not implement "removeAll" feature`)
  }
}
