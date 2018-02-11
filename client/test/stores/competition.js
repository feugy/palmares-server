const {describe, it, beforeEach, afterEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
const choo = require('choo')
const sinon = require('sinon')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const Competition = require('../../../server/lib/models/competition')
const store = require('../../lib/stores/competition')

const toJSON = c => c.toJSON()

describe('competition-list-item component', () => {
  let state
  let emitter
  let network

  beforeEach(() => {
    const app = choo()
    state = app.state
    emitter = app.emitter
    network = new MockAdapter(axios)
  })

  afterEach(() => {
    network.restore()
  })

  it('should initialize state and events', () => {
    store(state, emitter)

    assert(state.competitions === null)
    assert(state.currentCompetition === null)

    assert(state.events.FETCH_COMPETITIONS != null)
    assert(state.events.FETCH_CURRENT_COMPETITION != null)
  })

  it('should bound events', () => {
    const spy = sinon.spy(emitter, 'on')

    store(state, emitter)

    assert(spy.callCount === 2)
    const args = spy.getCalls().map(c => c.args[0])
    assert(args.includes(state.events.FETCH_COMPETITIONS))
    assert(args.includes(state.events.FETCH_CURRENT_COMPETITION))
  })

  it('should handle competition list error', () =>
    new Promise(resolve => {
      store(state, emitter)

      emitter.once(state.events.RENDER, () => {
        assert(state.competitions instanceof Error)
        assert(state.competitions.message.includes('failed with status code 500'))
        resolve()
      })

      network.onGet('/api/competition').reply(500)

      emitter.emit(state.events.FETCH_COMPETITIONS)
    })
  )

  it('should fetch competition list', () =>
    new Promise(resolve => {
      const competitions = [
        new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
        new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
      ]

      store(state, emitter)

      emitter.once(state.events.RENDER, () => {
        assert.deepStrictEqual(state.competitions.map(toJSON), competitions.map(toJSON))
        resolve()
      })

      network.onGet('/api/competition').reply(200, {
        offset: 0,
        size: 20,
        values: competitions.map(toJSON)
      })

      emitter.emit(state.events.FETCH_COMPETITIONS)
    })
  )

  it('should handle competition list error when fetching by id', () =>
    new Promise(resolve => {
      store(state, emitter)
      state.competitions = new Error('Failed to fetch competition list')

      emitter.on(state.events.RENDER, () => {
        assert(state.currentCompetition instanceof Error)
        assert(state.currentCompetition.message.includes('can\'t fetch competition list'))
        resolve()
      })

      emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '3')
    })
  )

  it('should handle error if competition can\'t be found', () =>
    new Promise(resolve => {
      store(state, emitter)
      state.competitions = [
        new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
        new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
      ]

      emitter.once(state.events.RENDER, () => {
        assert(state.currentCompetition instanceof Error)
        assert(state.currentCompetition.message.includes('no competition for id 3'))
        resolve()
      })

      emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '3')
    })
  )

  it('should fetch competition by id with pre-loaded list', () =>
    new Promise(resolve => {
      store(state, emitter)
      state.competitions = [
        new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
        new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
      ]

      emitter.once(state.events.RENDER, () => {
        assert.deepStrictEqual(state.currentCompetition, state.competitions[1])
        resolve()
      })

      emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '2')
    })
  )

  it('should fetch competition by id', () =>
    new Promise(resolve => {
      const competitions = [
        new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
        new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
      ]

      store(state, emitter)

      emitter.once(state.events.RENDER, () => {
        emitter.once(state.events.RENDER, () => {
          assert.deepStrictEqual(state.currentCompetition.toJSON(), competitions[0].toJSON())
          resolve()
        })
      })

      network.onGet('/api/competition').reply(200, {
        offset: 0,
        size: 20,
        values: competitions.map(toJSON)
      })

      emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '1')
    })
  )
})
