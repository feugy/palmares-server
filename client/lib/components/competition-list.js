const html = require('choo/html')
const css = require('sheetify')
const {i18n} = require('../labels')
const competition = require('./competition-list-item')

const styles = css`
  :host {
    box-sizing: content-box;
    display: flex;
    flex-flow: row wrap;
    justify-content: center;
    width: 100%;
  }

  :host > * {
    margin: 1em;
  }
`

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
  return html`<div class=${styles}>${list.map(competition)}</div>`
}
