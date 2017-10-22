// Ranking wrap result of a given couple inside a competition
module.exports = class Ranking {
  /**
   * Ranking constructor.
   *
   * @param {Object} attrs - raw attributes, copies inside the built ranking
   * @returns the build ranking
   */
  constructor (attrs) {
    // the couple name
    this.couple = null

    // the contest kind (may contains age-category and dance-category)
    this.contest = null

    // dance kind: 'std', 'lat' or 'ten'
    this.kind = null

    // couple final ranking
    this.rank = 0

    // number of couples involved
    this.total = 0

    Object.assign(this, attrs)
  }

  /**
   * @returns a plain JSON representation of this ranking
   */
  toJSON () {
    return {
      couple: this.couple,
      kind: this.kind,
      contest: this.contest,
      rank: this.rank,
      total: this.total
    }
  }
}
