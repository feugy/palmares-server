const html = require('choo/html')
const {i18n} = require('../labels')
const competition = require('./competition-list-item')

/**
 * Render a list of competitions as an unordered list
 *
 * @param {Array<Object>} list - rendered list of competitions, may be empty
 * @returns {html} rendered list of competition
 */
module.exports = list => {
  if (!Array.isArray(list) || !list.length) {
    return html`<span>${i18n('labels.emptyCompetitionList')}</span>`
  }
  return html`
    <ul>
      ${list.map(competition)}
    </ul>
  `
}
