const {describe, it, beforeEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
require('browser-env')()
const choo = require('choo')
const Competition = require('../../../server/lib/models/competition')
const view = require('../../lib/views/competition-details')

describe('competition-details view', () => {
  let state
  let emitter
  let emit

  beforeEach(() => {
    const app = choo()
    app.state.params = {id: null}
    app.state.events.FETCH_CURRENT_COMPETITION = 'whatever'
    app.state.currentCompetition = null
    state = app.state
    emitter = app.emitter
    emit = app.emitter.emit.bind(app.emitter)
  })

  it('should not show competition first', () => {
    const html = view(state, emit)
    assert(html.querySelector('span.loading') != null)
  })

  it('should handle unfound competition', () => {
    state.currentCompetition = new Error('not found')

    const html = view(state, emit)
    assert(html.querySelector('span.error') != null)
    assert(html.querySelector('span.error').textContent.includes('not found'))
  })

  it('should display competition', () => {
    state.params.id = '2'
    state.currentCompetition = new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})

    const html = view(state, emit)
    assert(html.querySelector('h2').textContent.includes('Lyon'))
  })

  it('should ask to load competition if current is different', () =>
    new Promise(resolve => {
      state.params.id = '1'
      state.currentCompetition = new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})

      emitter.on(state.events.FETCH_CURRENT_COMPETITION, id => {
        assert(id === state.params.id)
        resolve()
      })

      const html = view(state, emit)
      assert(html.querySelector('span.loading') != null)
    })
  )
})
