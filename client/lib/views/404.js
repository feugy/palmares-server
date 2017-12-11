const html = require('choo/html')
const {i18n} = require('../labels')

/**
 * Renders an error page for unknown routes.
 *
 * @param {Object}    state - application global state
 * @param {String}      state.title - current page title
 * @param {Function}  emit - to emit events
 */
module.exports = (state, emit) => {
  const title = i18n('pageTitles.notFound')
  if (state.title !== title) {
    emit(state.events.DOMTITLECHANGE, title)
  }
  return html`
    <body>
      <h1>${i18n('titles.notFound')}</h1>
      <a href="/">${i18n('buttons.backToMain')}</a>
    </body>
  `
}
