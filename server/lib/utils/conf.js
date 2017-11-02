
const {safeLoad} = require('js-yaml')
const {promisify} = require('util')
const readFile = promisify(require('fs').readFile)
const {merge} = require('lodash/fp')

/**
 * Read YAML configuration file from given path, using some env variable as default for values:
 * - port: PORT
 * - storage.url: MONGO_URL
 * - auth.key: JWT_KEY
 * @param {String} path - relative or absolute path of configuration file
 * @returns {Object} parsed configuration
 * @throws {Error} - if file doesn't exist or cannot be read
 * @throws {Error} - if configuration content cannot be parsed as Yaml
 */
exports.readConf = async path => {
  let content
  let conf
  try {
    content = await readFile(path)
  } catch (err) {
    throw new Error(`failed to load configuration from file ${path}: ${err.message}`)
  }
  try {
    conf = safeLoad(content)
  } catch (err) {
    throw new Error(`failed to parse configuration from file ${path}: ${err.message}`)
  }
  return merge({
    port: process.env.PORT,
    storage: {
      url: process.env.MONGO_URL
    },
    auth: {
      key: process.env.JWT_KEY
    }
  }, conf)
}
