const test = require('ava').default
require('browser-env')()
const choo = require('choo')
const view = require('../../lib/views/404')

test.beforeEach(t => {
  const app = choo()
  t.context.state = app.state
  t.context.emitter = app.emitter
  t.context.emit = app.emitter.emit.bind(app.emitter)
})

test.cb('should display error message and set title', t => {
  const {state, emit, emitter} = t.context

  emitter.on(state.events.DOMTITLECHANGE, title => {
    t.true(title.includes('route not found'))
    setTimeout(t.end, 0)
  })

  const html = view(state, emit)

  t.is(html.querySelector('h1').textContent, '404 - route not found')
})
