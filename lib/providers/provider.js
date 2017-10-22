const Joi = require('joi')
const {EventEmitter} = require('events')

const optsSchema = Joi.object({
  name: Joi.string().required(),
  url: Joi.string().required(),
  list: Joi.string().required(),
  dateFormat: Joi.string().required()
}).required().unknown().label('opts')

// Abstract class for providers
module.exports = class Provider extends EventEmitter {
  /**
   * Provider constructor: initialize with configuration
   *
   * @param {Object} opts - provider configuration. Must contains:
   * @param {String} opts.name - the provider name, for error messages
   * @param {String} opts.url - website root url
   * @param {String} opts.list - web page to list results
   * @param {String} opts.dateFormat - moment format used to extract dates
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
   * Provide a custom sync method to extract competitions over the internet.
   * Only read operation is supported.
   *
   * @param {Number} year - year for which results are listed
   * @returns {Promise<Array>} resolved with list of competitions extracted (may be empty).
   */
  listResults (year) {
    return Promise.reject(new Error(`${this.opts.name} does not implement "listResults" feature`))
  }

  /**
   * Load details for a given competition.
   * It list the competition's contests, and for each contests, couple ranking.
   * The competition's contests array will be filled once finished.
   *
   * @param {Object} competition - the loaded competition
   * @returns {Promise<Competition>} resolved when competition was loaded
   */
  getDetails (competition) {
    return Promise.reject(new Error(`${this.opts.name} does not implement "getDetails" feature`))
  }

  /**
   * Get a list (that may be empty) of group names that contains the searched string.
   * Depending on the provider, a group is a club or a country, and wildcards may be supported.
   *
   * @param {String} [searched = ''] - optionnal searched string
   * @returns {Promise<Array>} resolved with list of strings containing the club names (may be empty).
   */
  searchGroups (searched = '') {
    return Promise.reject(new Error(`${this.opts.name} does not implement "searchGroups" feature`))
  }

  /**
   * Get a list (that may be empty) of couples were one of the dancers name contains the searched string.
   * Depending on the provider, wildcards may be supported, and search may apply on fisrt name, last name or both.
   *
   * @param {String} [searched = ''] - searched string
   * @returns {Promise<Array>} resolved with list of strings containing the couple names (may be empty).
   */
  searchCouples (searched = '') {
    return Promise.reject(new Error(`${this.opts.name} does not implement "searchCouples" feature`))
  }

  /**
   * Get the list of all active couples for a given group.
   * Depending on the provider, a group may represent a club or a country.
   *
   * @param {String} group - the concerned club or country.
   * @returns {Promise<Array>} resolved with list of strings containing the couple names (may be empty).
   */
  getGroupCouples (group) {
    return Promise.reject(new Error(`${this.opts.name} does not implement "getGroupCouples" feature`))
  }
}
