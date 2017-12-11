const test = require('ava').default
const choo = require('choo')
const sinon = require('sinon')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const Competition = require('../../../server/lib/models/competition')
const store = require('../../lib/stores/competition')

const toJSON = c => c.toJSON()

test.beforeEach(t => {
  const app = choo()
  t.context.state = app.state
  t.context.emitter = app.emitter
  t.context.network = new MockAdapter(axios)
})

test.afterEach(t => {
  t.context.network.restore()
})

test('should initialize state and events', t => {
  const {state, emitter} = t.context
  store(state, emitter)

  t.is(state.competitions, null)
  t.is(state.currentCompetition, null)

  t.true(state.events.FETCH_COMPETITIONS != null)
  t.true(state.events.FETCH_CURRENT_COMPETITION != null)
})

test('should bound events', t => {
  const {state, emitter} = t.context
  const spy = sinon.spy(emitter, 'on')

  store(state, emitter)

  t.is(spy.callCount, 2)
  const args = spy.getCalls().map(c => c.args[0])
  t.true(args.includes(state.events.FETCH_COMPETITIONS))
  t.true(args.includes(state.events.FETCH_CURRENT_COMPETITION))
})

test.cb('should handle competition list error', t => {
  const {state, emitter, network} = t.context
  store(state, emitter)

  emitter.once(state.events.RENDER, () => {
    t.true(state.competitions instanceof Error)
    t.true(state.competitions.message.includes('failed with status code 500'))
    t.end()
  })

  network.onGet('/api/competition').reply(500)

  emitter.emit(state.events.FETCH_COMPETITIONS)
})

test.cb('should fetch competition list', t => {
  const {state, emitter, network} = t.context
  const competitions = [
    new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
    new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
  ]

  store(state, emitter)

  emitter.once(state.events.RENDER, () => {
    t.deepEqual(state.competitions.map(toJSON), competitions.map(toJSON))
    t.end()
  })

  network.onGet('/api/competition').reply(200, {
    offset: 0,
    size: 20,
    values: competitions.map(toJSON)
  })

  emitter.emit(state.events.FETCH_COMPETITIONS)
})

test.cb('should handle competition list error when fetching by id', t => {
  const {state, emitter} = t.context
  store(state, emitter)
  state.competitions = new Error('Failed to fetch competition list')

  emitter.on(state.events.RENDER, () => {
    t.true(state.currentCompetition instanceof Error)
    t.true(state.currentCompetition.message.includes('can\'t fetch competition list'))
    t.end()
  })

  emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '3')
})

test.cb('should handle error if competition can\'t be found', t => {
  const {state, emitter} = t.context
  store(state, emitter)
  state.competitions = [
    new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
    new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
  ]

  emitter.once(state.events.RENDER, () => {
    t.true(state.currentCompetition instanceof Error)
    t.true(state.currentCompetition.message.includes('no competition for id 3'))
    t.end()
  })

  emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '3')
})

test.cb('should fetch competition by id with pre-loaded list', t => {
  const {state, emitter} = t.context
  store(state, emitter)
  state.competitions = [
    new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
    new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
  ]

  emitter.once(state.events.RENDER, () => {
    t.deepEqual(state.currentCompetition, state.competitions[1])
    t.end()
  })

  emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '2')
})

test.cb('should fetch competition by id', t => {
  const {state, emitter, network} = t.context
  const competitions = [
    new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
    new Competition({id: '2', place: 'Lyon', date: '2017-10-15'})
  ]

  store(state, emitter)

  emitter.once(state.events.RENDER, () => {
    emitter.once(state.events.RENDER, () => {
      t.deepEqual(state.currentCompetition.toJSON(), competitions[0].toJSON())
      t.end()
    })
  })

  network.onGet('/api/competition').reply(200, {
    offset: 0,
    size: 20,
    values: competitions.map(toJSON)
  })

  emitter.emit(state.events.FETCH_CURRENT_COMPETITION, '1')
})
