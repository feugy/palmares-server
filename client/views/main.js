const html = require('choo/html')

const title = '🚂🚋🚋'

module.exports = (state, emit) => {
  if (state.title !== title) {
    emit(state.events.DOMTITLECHANGE, title)
  }

  const handleClick = () => emit('clicks:add', 1)
  return html`
    <body>
      <h1>
        Choo choo!!!
      </h1>

      <div>
        <p>Current number of clicks: ${state.totalClicks}</p>

        <button onclick=${handleClick}>Click Me!</button>
        <a href="/bla">Trigger 404</a>
      </div>
    </body>
  `
}
