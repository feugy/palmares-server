const html = require('choo/html')

/**
 * Render a single competition contest, as part of an HTML list
 *
 * @param {Object}  contest - rendered contest, including
 * @param {String}    competition.title - contest name and serie
 * @param {Object}    competition.results - hash where keys are couple names, and value ranking
 * @returns {html} rendered contest
 */
module.exports = contest => {
  if (!contest) return ``
  const {title, results} = contest
  return html`
    <li>
      <h3>${title}</h3>
      <ul class="mdl-list">${Object.keys(results)
    .map(names =>
      html`<li class="mdl-list__item">
        <span class="mdl-list__item-primary-content">
          <i class="material-icons  mdl-list__item-avatar">people</i>
          ${names}: ${results[names]}
        </span>
      </li>`
    )}</ul>
    </li>
  `
}
