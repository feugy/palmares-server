const html = require('choo/html')
const {i18n} = require('../labels')
const competitionList = require('../components/competition-list')

/**
 * Renders available competition as a list.
 *
 * Will emit event `competitions:fetch` to load list if not already set.
 * Will render an error page if competition list can't be found.
 *
 * @param {Object}                  state - application global state
 * @param {String}                    state.title - current page title
 * @param {Array<Competition>|Error}  state.competitions - competition list
 * @param {Function}                emit - to emit events
 */
module.exports = (state, emit) => {
  const title = i18n('pageTitles.main')
  const {
    title: currentTitle,
    competitions,
    events: {DOMTITLECHANGE}
  } = state

  if (currentTitle !== title) {
    emit(DOMTITLECHANGE, title)
  }

  // error handling first
  if (competitions instanceof Error) {
    return html`
      <body>
        <h2>${i18n('titles.competitions')}</h2>
        <span class="error">${i18n('errors.competitionList', competitions)}</span>
      </body>
    `
  }

  if (!competitions) {
    // no competition list yet, let's fetch it and display loader
    emit('competitions:fetch')
    return html`
      <body>
      <h2>${i18n('titles.competitions')}</h2>
        <span class="loading">${i18n('labels.loading')}</span>
      </body>
    `
  }

  return html`
    <body>
    <h2>${i18n('titles.competitions')}</h2>
      ${competitionList(competitions)}
    </body>
  `
}
