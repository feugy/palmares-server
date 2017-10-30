const Joi = require('joi')
const {EventEmitter} = require('events')

const optsSchema = Joi.object({
  name: Joi.string().required()
}).required().unknown().label('opts')

/**
 * Storage is an interface to store and retrieve JSON structures of a given model.
 */
module.exports = class Storage extends EventEmitter {
  /**
   * @constructor
   * Storage constructor: initialize with configuration
   *
   * @param {Object} opts - provider configuration. Must contains:
   * @param {String} opts.name - the storage name, for error messages
   */
  constructor (opts) {
    super()

    // Provider configuration options. @see constructor
    const {error} = Joi.validate(opts, optsSchema)
    if (error) {
      throw error
    }
    this.opts = opts

    this.setMaxListeners(0)
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
   * @returns {Object} resolve with retrieved model, or null if no model could be found
   */
  async findById (modelClass, id) {
    throw new Error(`${this.opts.name} does not implement "findById" feature`)
  }

  /**
   * @async
   * Get a list of model matching given criteria
   *
   * @param {Object} modelClass - model class
   * @param {Object} criteria - search criteria, like a mongo query
   * @returns {Array<Object>} matching models (may be an empty array)
   */
  async find (modelClass, criteria) {
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
