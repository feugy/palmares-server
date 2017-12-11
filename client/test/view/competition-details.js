const test = require('ava').default
require('browser-env')()
const choo = require('choo')
const Competition = require('../../../server/lib/models/competition')
const view = require('../../lib/views/competition-details')

test.beforeEach(t => {
  const app = choo()
  app.state.params = {id: null}
  app.state.currentCompetition = null
  t.context.state = app.state
  t.context.emitter = app.emitter
  t.context.emit = app.emitter.emit.bind(app.emitter)
})

test('should not show competition first', t => {
  const {state, emit} = t.context

  const html = view(state, emit)
  t.true(html.querySelector('span.loading') != null)
})

test('should handle unfound competition', t => {
  const {state, emit} = t.context
  state.currentCompetition = new Error('not found')

  const html = view(state, emit)
  t.true(html.querySelector('span.error') != null)
  t.true(html.querySelector('span.error').textContent.includes('not found'))
})

test('should display competition', t => {
  const {state, emit} = t.context
  state.params.id = '2'
  state.currentCompetition = new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})

  const html = view(state, emit)
  t.true(html.querySelector('h2').textContent.includes('Lyon'))
})

test.cb('should ask to load competition if current is different', t => {
  const {state, emit, emitter} = t.context
  state.params.id = '1'
  state.currentCompetition = new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})

  emitter.on('competitions:fetchCurrent', id => {
    t.is(id, state.params.id)
    t.end()
  })

  const html = view(state, emit)
  t.true(html.querySelector('span.loading') != null)
})
