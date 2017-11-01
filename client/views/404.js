const html = require('choo/html')

const title = '🚂🚋🚋 - route not found'

module.exports = (state, emit) => {
  if (state.title !== title) {
    emit(state.events.DOMTITLECHANGE, title)
  }
  return html`
    <body>
      <h1>
        404 - route not found
      </h1>
      <a href="/">
        Back to main
      </a>
    </body>
  `
}
