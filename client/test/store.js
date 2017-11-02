const test = require('ava').default
const choo = require('choo')
const sinon = require('sinon')
const store = require('../lib/store')

test.beforeEach(t => {
  const app = choo()
  t.context.state = app.state
  t.context.emitter = app.emitter
})

test('should initialize store', t => {
  const {state, emitter} = t.context
  store(state, emitter)
  t.is(state.totalClicks, 0)
})

test('should bound events', t => {
  const {state, emitter} = t.context
  store(state, emitter)
  const spy = sinon.spy(emitter, 'on')
  emitter.emit(state.events.DOMCONTENTLOADED)

  // expectation on spy
  t.true(spy.calledOnce)
  t.is(spy.getCall(0).args[0], 'clicks:add')
})

test('should add clikss', t => {
  const {state, emitter} = t.context
  // init
  store(state, emitter)
  emitter.emit(state.events.DOMCONTENTLOADED)
  t.is(state.totalClicks, 0)

  // performs action
  emitter.emit('clicks:add', 2)
  t.is(state.totalClicks, 2)
})
