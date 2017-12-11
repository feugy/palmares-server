const test = require('ava').default
require('browser-env')()
const choo = require('choo')
const Competition = require('../../../server/lib/models/competition')
const view = require('../../lib/views/competitions')

test.beforeEach(t => {
  const app = choo()
  t.context.state = app.state
  t.context.emitter = app.emitter
  t.context.emit = app.emitter.emit.bind(app.emitter)
})

test('should not show any competition first', t => {
  const {state, emit} = t.context

  const html = view(state, emit)
  t.true(html.querySelector('span.loading') != null)
})

test('should handle unfound list', t => {
  const {state, emit} = t.context
  state.competitions = new Error('not found')

  const html = view(state, emit)
  t.true(html.querySelector('span.error') != null)
  t.true(html.querySelector('span.error').textContent.includes('not found'))
})

test('should handle empty list', t => {
  const {state, emit} = t.context
  state.competitions = []

  const html = view(state, emit)
  t.is(html.querySelector('h2 + span').textContent, 'Aucune compétition pour l\'instant')
})

test('should display competition list', t => {
  const {state, emit} = t.context
  state.competitions = [
    new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
    new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
  ]

  const html = view(state, emit)
  t.is(html.querySelectorAll('ul > li').length, 2)
  t.true(html.querySelector('ul > li:first-child').textContent.includes('Paris'))
  t.is(html.querySelector('ul > li:first-child a').getAttribute('href'), '/competition/1')
  t.true(html.querySelector('ul > li:last-child').textContent.includes('Lyon'))
  t.is(html.querySelector('ul > li:last-child a').getAttribute('href'), '/competition/2')
})

test.cb('should ask to load list if not set yet', t => {
  const {state, emit, emitter} = t.context

  emitter.on('competitions:fetch', t.end)

  const html = view(state, emit)
  t.true(html.querySelector('span.loading') != null)
})

/* test('should display number of clicks', t => {
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
}) */
