const html = require('choo/html')
const css = require('sheetify')
const {i18n} = require('../labels')

const styles = css`
  :host.mdl-card {
    width: 200px;
    height: 200px;
  }
`

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
    <div class="${styles} mdl-card mdl-shadow--2dp" id="${competition.id}">
      <div class="mdl-card__title mdl-card--expand">
        <h4>
          ${competition.place}<br>${competition.date.format(i18n('formats.competitionDate'))}
        </h4>
      </div>
      <div class="mdl-card__actions mdl-card--border">
        <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" href="/competition/${competition.id}">
          Voir
        </a>
      </div>
    </div>
  `
}
