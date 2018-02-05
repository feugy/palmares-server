const {describe, it, beforeEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
require('browser-env')()
const choo = require('choo')
const Competition = require('../../../server/lib/models/competition')
const view = require('../../lib/views/competitions')

describe('competition view', () => {
  let state
  let emitter
  let emit

  beforeEach(() => {
    const app = choo()
    state = app.state
    emitter = app.emitter
    emit = app.emitter.emit.bind(app.emitter)
  })

  it('should not show any competition first', () => {
    const html = view(state, emit)
    assert(html.querySelector('span.loading') != null)
  })

  it('should handle unfound list', () => {
    state.competitions = new Error('not found')

    const html = view(state, emit)
    assert(html.querySelector('span.error') != null)
    assert(html.querySelector('span.error').textContent.includes('not found'))
  })

  it('should handle empty list', () => {
    state.competitions = []

    const html = view(state, emit)
    assert(html.querySelector('h2 + span').textContent === 'Aucune compétition pour l\'instant')
  })

  it('should display competition list', () => {
    state.competitions = [
      new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
      new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
    ]

    const html = view(state, emit)
    assert(html.querySelectorAll('ul > li').length === 2)
    assert(html.querySelector('ul > li:first-child').textContent.includes('Paris'))
    assert(html.querySelector('ul > li:first-child a').getAttribute('href') === '/competition/1')
    assert(html.querySelector('ul > li:last-child').textContent.includes('Lyon'))
    assert(html.querySelector('ul > li:last-child a').getAttribute('href') === '/competition/2')
  })

  it('should ask to load list if not set yet', () =>
    new Promise(resolve => {
      emitter.on('competitions:fetch', resolve)

      const html = view(state, emit)
      assert(html.querySelector('span.loading') != null)
    })
  )

  /* it('should display number of clicks', () => {
    const {state, emit} = t.context

    state.totalClicks = 10
    const html = view(state, emit)
    assert(html.querySelector('div > p').textContent === 'Current number of clicks: 10')
  })

  test.cb('should trigger click addition', () => {
    const {state, emit, emitter} = t.context

    const html = view(state, emit)

    emitter.on('clicks:add', value => {
      assert(value === 1)
      t.end()
    })

    html.querySelector('button').dispatchEvent(new Event('click'))
  }) */
})
