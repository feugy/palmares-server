const test = require('ava').default
const moment = require('moment')
const Palmares = require('../lib/palmares')
const Competition = require('../lib/models/competition')
const {
  getFFDSProvider,
  getLogger,
  getMongoStorage,
  getWDSFProvider,
  startFFDSServer,
  startWDSFServer
} = require('./test-utils')

class Test {}
let ffdsServer
const ffdsPort = 9876
let wdsfServer
const wdsfPort = 9875

test.before(async () => {
  ffdsServer = await startFFDSServer(ffdsPort)
  wdsfServer = await startWDSFServer(wdsfPort)
})

test.after.always(async () => {
  await ffdsServer.stop()
  await wdsfServer.stop()
})

test.beforeEach(t => {
  t.context.storage = getMongoStorage()
  t.context.palmares = new Palmares(
    t.context.storage,
    [getFFDSProvider(ffdsPort), getWDSFProvider(wdsfPort)],
    getLogger()
  )
})

test.afterEach.always(t => {
  t.context.storage.removeAll(Competition)
})

test('should reject if no storage provided ', t => {
  const err = t.throws(() => new Palmares(), Error)
  t.true(err.message.includes('"storage" is required'))
})

test('should reject if storage does\'t implement Storage', t => {
  const err = t.throws(() => new Palmares(new Test(), [], getLogger()), Error)
  t.true(err.message.includes('"storage" must be an instance of "Storage'))
})

test('should reject if no providers provided ', t => {
  const err = t.throws(() => new Palmares(t.context.storage, undefined, getLogger()), Error)
  t.true(err.message.includes('"providers" is required'))
})

test('should reject if providers does\'t implement Provider', t => {
  const err = t.throws(() => new Palmares(t.context.storage, [new Test()], getLogger()), Error)
  t.true(err.message.includes('"0" must be an instance of "Provider'))
})

test('should reject if no logger is provided', t => {
  const err = t.throws(() => new Palmares(t.context.storage, []), Error)
  t.true(err.message.includes('"logger" is required'))
})

test('should fetch competitions for first time', async t => {
  const {storage, palmares} = t.context
  const {competitions, year} = await palmares.update(2012)
  t.is(year, 2012)
  t.is(competitions.length, 7)

  const stored = await storage.find(Competition)
  t.is(stored.length, 7)
})

test('should fetch new competitions', async t => {
  const {storage, palmares} = t.context
  await storage.save(new Competition({
    id: '45ca729adf5a8b963b73bbd6197d3a32',
    date: moment('2013-02-16'),
    place: 'Illzach',
    url: 'http://127.0.0.1:9876/compet-resultats.php?NumManif=1313'
  }))

  let results = await palmares.update(2012)
  t.is(results.year, 2012)
  t.is(results.competitions.length, 6)

  results = await palmares.update(2016)
  t.is(results.year, 2016)
  t.is(results.competitions.length, 0) // all cancelled

  const stored = await storage.find(Competition)
  t.is(stored.length, 7)
})

test('should handle provider error', async t => {
  const err = await t.throws(t.context.palmares.update(2017), Error)
  t.true(err.message.includes('failed to fetch results from FFDS'))
})

test('should not update simultaneously', async t => {
  const {palmares} = t.context

  let results = await Promise.all([
    palmares.update(2012),
    palmares.update(2013),
    palmares.update(2012)
  ])
  t.is(results[0].competitions.length, 7)
  t.is(results[0].year, 2012)
  t.deepEqual(results[0], results[1])
  t.deepEqual(results[0], results[2])
})

test('should not parallel update fail together', async t => {
  const {palmares} = t.context

  const err = await t.throws(Promise.all([
    palmares.update(2017),
    palmares.update(2017),
    palmares.update(2017)
  ]), Error)

  t.true(err.message.includes('failed to fetch results from FFDS'))
  t.is(palmares.competitionIds.length, 0)
})
