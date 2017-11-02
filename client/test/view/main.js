const test = require('ava').default
require('browser-env')()
const choo = require('choo')
const view = require('../../lib/views/main')

test.beforeEach(t => {
  const app = choo()
  t.context.state = app.state
  t.context.emitter = app.emitter
  t.context.emit = app.emitter.emit.bind(app.emitter)
})

test('should display number of clicks', t => {
  const {state, emit} = t.context

  state.totalClicks = 10
  const html = view(state, emit)
  t.is(html.querySelector('div > p').textContent, 'Current number of clicks: 10')
})

test.cb('should trigger click addition', t => {
  const {state, emit, emitter} = t.context

  const html = view(state, emit)

  emitter.on('clicks:add', value => {
    t.is(value, 1)
    t.end()
  })

  html.querySelector('button').dispatchEvent(new Event('click'))
})
