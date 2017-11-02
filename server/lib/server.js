const {Server} = require('hapi')
const Joi = require('joi')
const MongoStorage = require('./storages/mongodb')
const FFDSProvider = require('./providers/ffds')
const WDSFProvider = require('./providers/wdsf')
const Palmares = require('./palmares')

const optsSchema = Joi.object({
  port: Joi.number().required().integer().description('port on which server will be listening'),
  logLevel: Joi.string().optional().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'),

  storage: Joi.object({
    name: Joi.string().required().valid('Mongo').description('storage implementation')
  }).unknown(true).description('storage options, see individual Storage implementation'),

  providers: Joi.array().required().items(Joi.object({
    name: Joi.string().required().valid('FFDS', 'WDSF').description('provider implementation')
  }).unknown(true)).description('array of provider options'),

  auth: Joi.object({
    key: Joi.string().required().description('key used for JWT validation')
  }).unknown(true).required().description('authentication configuration')
}).required().unknown().label('opts')

/**
 * Creates and starts a server.
 * For provider and storage options, please refer to individual implementation.
 *
 * @param {Object} opts                 - server options, including:
 * @param {Number} opts.port              - port on which server will be listening
 * @param {Object} opts.storage           - storage options, including:
 * @param {String} opts.storage.name        - storage name, could be 'Mongo'
 * @param {Array<Object>} opts.providers  - array of provider options, including:
 * @param {String} opts.providers.name      - provider name, could be 'FFDS' or 'WDSF'
 * @param {String} opts.auth              - authentication options, including:
 * @param {String} opts.auth.key            - JWT secret key
 * @returns {Server} hapi server, fully configured
 */
module.exports = async (opts) => {
  // Provider configuration options. @see constructor
  const {error} = Joi.validate(opts, optsSchema)
  if (error) {
    throw error
  }

  const server = new Server()
  server.connection({port: opts.port})

  await server.register({
    register: require('hapi-pino'),
    options: {
      logEvents: ['onPostStart', 'onPostStop', 'request-error']
    }
  })

  const defOpts = {logger: server.logger()}
  defOpts.logger.level = opts.logLevel || 'info'
  // build storage engine, and palmares service
  const storage = new MongoStorage(Object.assign({}, defOpts, opts.storage))
  const palmares = new Palmares(storage, opts.providers.map(options => {
    if (options.name === 'FFDS') {
      return new FFDSProvider(Object.assign({}, defOpts, options))
    }
    if (options.name === 'WDSF') {
      return new WDSFProvider(Object.assign({}, defOpts, options))
    }
  }), defOpts.logger)

  // make them available to plugins
  server.decorate('request', 'storage', storage)
  server.decorate('request', 'palmares', palmares)

  await server.register([
    {
      register: require('./plugins/authentication'),
      options: opts.auth
    },
    require('./plugins/competition'),
    require('./plugins/static')
  ])
  await server.start()
  return server
}
