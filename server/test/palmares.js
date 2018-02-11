const {describe, it, before, after, beforeEach, afterEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
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
const longTest = {timeout: 10e3}

describe('palmares module', () => {
  let storage
  let palmares

  before(async () => {
    ffdsServer = await startFFDSServer(ffdsPort)
    wdsfServer = await startWDSFServer(wdsfPort)
  })

  after(async () => {
    await ffdsServer.stop()
    await wdsfServer.stop()
  })

  beforeEach(() => {
    storage = getMongoStorage()
    palmares = new Palmares(
      storage,
      [getFFDSProvider(ffdsPort), getWDSFProvider(wdsfPort)],
      getLogger()
    )
  })

  afterEach(() => {
    storage.removeAll(Competition)
  })

  it('should reject if no storage provided ', () => {
    try {
      new Palmares()
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"storage" is required'))
      return
    }
    throw new Error('should have failed')
  })

  it('should reject if storage does\'t implement Storage', () => {
    try {
      new Palmares(new Test(), [], getLogger())
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"storage" must be an instance of "Storage'))
      return
    }
    throw new Error('should have failed')
  })

  it('should reject if no providers provided ', () => {
    try {
      new Palmares(storage, undefined, getLogger())
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"providers" is required'))
      return
    }
    throw new Error('should have failed')
  })

  it('should reject if providers does\'t implement Provider', () => {
    try {
      new Palmares(storage, [new Test()], getLogger())
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"0" must be an instance of "Provider'))
      return
    }
    throw new Error('should have failed')
  })

  it('should reject if no logger is provided', () => {
    try {
      new Palmares(storage, [])
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"logger" is required'))
      return
    }
    throw new Error('should have failed')
  })

  it('should fetch competitions for first time', longTest, async () => {
    const {competitions, year} = await palmares.update(2012)
    assert(year === 2012)
    assert(competitions.length === 7)

    const stored = await storage.find(Competition)
    assert(stored.length === 7)
  })

  it('should fetch new competitions', longTest, async () => {
    await storage.save(new Competition({
      id: '45ca729adf5a8b963b73bbd6197d3a32',
      date: moment('2013-02-16'),
      place: 'Illzach',
      url: 'http://127.0.0.1:9876/compet-resultats.php?NumManif=1313'
    }))

    let results = await palmares.update(2012)
    assert(results.year === 2012)
    assert(results.competitions.length === 6)

    results = await palmares.update(2016)
    assert(results.year === 2016)
    assert(results.competitions.length === 0) // all cancelled

    const stored = await storage.find(Competition)
    assert(stored.length === 7)
  })

  it('should handle provider error', async () => {
    try {
      await palmares.update(2017)
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to fetch results from FFDS'))
      return
    }
    throw new Error('should have failed')
  })

  it('should not update simultaneously', longTest, async () => {
    let results = await Promise.all([
      palmares.update(2012),
      palmares.update(2013),
      palmares.update(2012)
    ])
    assert(results[0].competitions.length === 7)
    assert(results[0].year === 2012)
    assert.deepStrictEqual(results[0], results[1])
    assert.deepStrictEqual(results[0], results[2])
  })

  it('should not parallel update fail together', async () => {
    try {
      await Promise.all([
        palmares.update(2017),
        palmares.update(2017),
        palmares.update(2017)
      ])
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to fetch results from FFDS'))
      assert(palmares.competitionIds.length === 0)
      return
    }
    throw new Error('should have failed')
  })
})
