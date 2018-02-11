const html = require('choo/html')
const {i18n} = require('../labels')
const contest = require('../components/contest')

/**
 * Renders detailed page for a given competition.
 * Desired competition id is expected as route parameter `id`.
 *
 * Will emit event `competitions:fetchCurrent` to load competition if current isn't the expected one.
 * Will render an error page if current competition can't be found.
 *
 * @param {Object}          state - application global state
 * @param {String}            state.title - current page title
 * @param {Competition|Error} state.currentCompetition - displayed competition
 * @param {Object}            state.params - route parameters
 * @param {String}              state.params.id - desired competition id
 * @param {Function}        emit - to emit events
 */
module.exports = (state, emit) => {
  const {
    title: currentTitle,
    params: {id},
    events: {DOMTITLECHANGE, FETCH_CURRENT_COMPETITION},
    currentCompetition
  } = state

  // error handling first
  if (currentCompetition instanceof Error) {
    return html`
      <body>
        <a href="/competitions">${i18n('buttons.backToList')}</a>
        <span class="error">${i18n('errors.currentCompetition', currentCompetition)}</span>
      </body>
    `
  }

  if (!currentCompetition || currentCompetition.id !== id) {
    // current competition has changed, let's fetch it and display loader
    emit(FETCH_CURRENT_COMPETITION, id)
    return html`
      <body>
        <span class="loading">${i18n('labels.loading')}</span>
      </body>
    `
  }

  const title = i18n('pageTitles.competitionDetails', currentCompetition)
  if (currentTitle !== title) {
    emit(DOMTITLECHANGE, title)
  }

  return html`
    <body>
      <a href="/competitions">${i18n('buttons.backToList')}</a>
      <h2>${i18n('titles.competitionDetails', currentCompetition)}</h2>
      <ul>${currentCompetition.contests.map(contest)}</ul>
    </body>
  `
}
