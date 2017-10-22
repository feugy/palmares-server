const Boom = require('boom')
const {sortBy} = require('lodash/fp')

module.exports = {
  ...require('./promises'),

  ...require('./sanitize'),

  /**
   * Generates a catch handler that:
   * - wraps Request's errors into Boom errors with given message
   * - throw other errors
   * @param {String} message - error message in case of request error
   * @returns {Function} catch handler
   */
  handleRequestError: message => err => {
    if (err.statusCode) {
      throw Boom.create(err.statusCode, message, err.error)
    } else {
      throw err
    }
  },

  /**
   * From an array of competitions, ommit falsy ones and merge data urls
   * when competitions have same ids.
   * @param {Array<Competition>} competitions - list of extracted competitions
   * @returns {Array<Competition>} array of unique competitions, sorted by date
   */
  mergeCompetitions: competitions =>
    sortBy('date')(
      competitions.reduce((merged, extracted) => {
        if (extracted) {
          const existing = merged.find(({id}) => id === extracted.id)
          if (existing) {
            // do not add twice the same competition
            if (!existing.dataUrls.includes(extracted.url)) {
              // Merge urls if needed
              existing.dataUrls.push(extracted.url)
            }
          } else {
            merged.push(extracted)
          }
        }
        return merged
      }, [])
    )
}
