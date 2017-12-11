const moment = require('moment')

// Competition modelize an event that may last several days and contains many contests
module.exports = class Competition {
  /**
   * Competition constructor.
   * Attributes are initialized in one pass with the attrs parameter.
   *
   * @param {Object} attrs - raw attributes, copies inside the built competition
   * @returns the build competition
   */
  constructor (attrs) {
    // competition id
    this.id = null
    this.contests = []
    this.url = null

    Object.assign(this, attrs)
    if (this.id == null) {
      throw new Error('no id provided for competition')
    }
    this.date = moment.utc(this.date)
    if (!Array.isArray(this.dataUrls)) {
      this.dataUrls = [this.url]
    }
  }

  /**
   * @returns a plain JSON representation of this competition
   */
  toJSON () {
    return Object.assign({}, this, {date: this.date.toDate()})
  }
}
