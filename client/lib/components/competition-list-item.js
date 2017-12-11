const html = require('choo/html')
const {i18n} = require('../labels')

/**
 * Render a single competition, as part of an HTML list
 *
 * @param {Object}  competition - rendered competition, including
 * @param {String}    competition.id - identifier
 * @param {String}    competition.place - hosting place
 * @param {Moment}    competition.date - occurence date
 * @returns {html} rendered competition
 */
module.exports = competition => {
  return html`
    <li id="${competition.id}">
      <a href="/competition/${competition.id}">
        <span class="date">${competition.date.format(i18n('formats.competitionDate'))}</span>
        <span class="name">${competition.place}</span>
      </a>
    </li>
  `
}
