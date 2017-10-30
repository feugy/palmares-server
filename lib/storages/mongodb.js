const Joi = require('joi')
const {MongoClient} = require('mongodb')
const Storage = require('./storage')

// supported model classes
const classes = {
  competition: require('../models/competition')
}

const optsSchema = Joi.object({
  url: Joi.string().required()
}).required().unknown().label('opts')

/**
 * Serialize a given model into a plain JS object suitable for Mongo storage.
 * Ensure that model has _id, containing id value
 * Doesn't check that calsse is supported (assumes getCollectionName() will be invoked first)
 *
 * @param {Object} model - serialized model, that must have a toJSON() function
 * @param {String} model.id - model id, required
 * @returns {Object} Mongo friendly object
 */
const serialize = model => {
  // extract id, and rename it to _id for Mongo
  const {id: _id, ...remains} = model.toJSON()
  return {_id, ...remains}
}

/**
 * Deserialize a given model from a plain JS object to model object.
 *
 * @param {Object} modelClass - model class used
 * @param {Object} json - plain JS object
 * @param {String} model.id - model id, required
 * @returns {Object} Mongo friendly object
 */
const deserialize = (modelClass, json) => {
  if (!json) {
    return json
  }
  // extract _id, and rename it to id
  const {_id: id, ...remains} = json
  return new classes[modelClass.name.toLowerCase()]({id, ...remains})
}

/**
 * Extract collection name from model class.
 * Also ensure class is supported
 *
 * @param {Object} modelClass
 * @returns {String} model class name
 */
const getCollectionName = modelClass => {
  const name = modelClass.name.toLowerCase()
  if (!(name in classes)) {
    throw new Error(`Unsupported model class ${name}`)
  }
  return name
}

/**
 * Storage implementation on top on Mongo DB
 */
module.exports = class MongoDB extends Storage {
  /**
   * @constructor
   * Storage constructor: initialize with configuration
   *
   * @param {Object} opts - provider configuration. Must contains:
   * @param {String} opts.url - Url to database: mongodb://<user>:<password>@<host>:<port>/<db>
   */
  constructor (opts) {
    super(Object.assign({name: 'mongo'}, opts))

    // Provider configuration options. @see constructor
    const {error} = Joi.validate(opts, optsSchema)
    if (error) {
      throw error
    }

    this.db = null
  }

  /**
   * @private
   * @async
   * Create a client to a given Mongo database, and cache it.
   * Returns the corresponding collection
   *
   * @param {Object} modelClass - model class, used as collection name
   * @returns {Db} created (or cached) Db object
   */
  async _getCollection (modelClass) {
    if (!this.db) {
      this.db = await MongoClient.connect(this.opts.url)
    }
    return this.db.collection(getCollectionName(modelClass))
  }

  /** @inheritdoc */
  async save (saved) {
    const collection = await this._getCollection(saved.constructor)
    await collection.findOneAndReplace({_id: saved.id}, serialize(saved), {upsert: true})
    return saved
  }

  /** @inheritdoc */
  async remove (removed) {
    const collection = await this._getCollection(removed.constructor)
    await collection.findOneAndDelete({_id: removed.id})
    return removed
  }

  /** @inheritdoc */
  async findById (modelClass, id) {
    const collection = await this._getCollection(modelClass)
    return deserialize(modelClass, await collection.findOne({_id: id}))
  }

  /** @inheritdoc */
  async find (modelClass, criteria) {
    const collection = await this._getCollection(modelClass)
    const cursor = await collection.find(criteria).toArray()
    return cursor.map(json => deserialize(modelClass, json))
  }

  /** @inheritdoc */
  async removeAll (modelClass) {
    try {
      const collection = await this._getCollection(modelClass)
      await collection.drop()
    } catch (err) {
      if (!err.code || err.code !== 26) {
        // ns not found: colleciton doesn't exist
        throw err
      }
    }
  }
}
