const {describe, it, beforeEach, afterEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
const moment = require('moment')
const {MongoClient} = require('mongodb')
const {randomBytes} = require('crypto')
const MongoStorage = require('../../lib/storages/mongodb')
const Competition = require('../../lib/models/competition')
const {getMongoStorage, getLogger} = require('../test-utils')

const disconnectedStorage = new MongoStorage({
  url: 'mongodb://unknown:6541/unknown',
  logger: getLogger()
})
class Test {}

/**
 * Generates random hxadecimal id
 * @returns {String} random id of 32 characters
 */
const randomId = () => randomBytes(16).toString('hex').slice(0, 32)

/**
 * Run a given operation on a collection
 * @param {MongoStorage} storage - storage on which operation is performed
 * @param {String} collection - collection operated
 * @param {String} operation - operation run on collection (find, insert...)
 * @param {..any} args - arguments for the operation itself
 */
const runOperation = async (storage, collection, operation, ...args) => {
  const client = await MongoClient.connect(storage.opts.url)
  const database = storage.opts.url.match(/\/([^/]+)$/)[1]
  try {
    const col = client.db(database).collection(collection + storage.opts.suffix)
    const results = await col[operation](...args)
    await client.close()
    return results
  } catch (err) {
    await client.close()
    throw err
  }
}

describe('mongodb storage', () => {
  let storage
  beforeEach(() => {
    storage = getMongoStorage()
  })

  // deletes entire collection after all tests
  afterEach(async () => {
    try {
      await runOperation(storage, 'competition', 'drop')
    } catch (err) {
      // ignore errors when deleting
    }
  })

  // ------- constructor
  it('should fail when build without required options', () => {
    try {
      new MongoStorage({logger: getLogger()})
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"url" is required'))
      return
    }
    throw new Error('should have failed')
  })

  // ------- find
  it('should return empty results on empty model collection', async () => {
    try {
      await runOperation(storage, 'competition', 'drop')
    } catch (err) {
      // ignore
    }
    const fetched = await storage.find(Competition)
    assert(fetched.length === 0)
  })

  it('should return all models', async () => {
    const {insertedIds} = await runOperation(storage, 'competition', 'insertMany', [{
      _id: randomId(),
      place: 'Marseille',
      date: moment('2013-03-23').toDate(),
      url: 'nevermind'
    }, {
      _id: randomId(),
      place: 'Lille',
      date: moment('2013-03-16').toDate(),
      url: 'nevermind'
    }])

    const fetched = await storage.find(Competition)
    assert(fetched.length >= 2)

    let competition = fetched.find(c => c.id === insertedIds[0])
    assert(competition)
    assert(competition.place === 'Marseille')

    competition = fetched.find(c => c.id === insertedIds[1])
    assert(competition)
    assert(competition.place === 'Lille')
  })

  it('should return all by query', async () => {
    const {insertedIds} = await runOperation(storage, 'competition', 'insertMany', [{
      _id: randomId(),
      place: 'Paris',
      date: moment('2013-03-23').toDate(),
      url: 'nevermind'
    }, {
      _id: randomId(),
      place: 'Lyon',
      date: moment('2013-03-16').toDate(),
      url: 'nevermind'
    }, {
      _id: randomId(),
      place: 'Paris',
      date: moment('2013-02-05').toDate(),
      url: 'nevermind'
    }])

    const fetched = await storage.find(Competition, {place: 'Paris'})
    assert(fetched.length >= 2)

    let competition = fetched.find(c => c.id === insertedIds[0])
    assert(competition)

    competition = fetched.find(c => c.id === insertedIds[1])
    assert(competition === undefined)

    competition = fetched.find(c => c.id === insertedIds[2])
    assert(competition)
  })

  it('should handle disconnection error when finding model', async () => {
    try {
      await disconnectedStorage.find(Competition)
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to connect to server'))
      return
    }
    throw new Error('should have failed')
  })

  // ------- removeAll
  it('should drop empty model collection', async () => {
    const result = await storage.removeAll(Competition)
    assert(result === undefined)
  })

  it('should handle disconnection error when removing all models', async () => {
    try {
      await disconnectedStorage.removeAll(Competition)
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to connect to server'))
      return
    }
    throw new Error('should have failed')
  })

  // ------- save
  it('should reject unsupported model during save', async () => {
    try {
      await storage.save(new Test())
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('Unsupported model class test'))
      return
    }
    throw new Error('should have failed')
  })

  it('should save a competition', async () => {
    const competition = new Competition({
      id: randomId(),
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: 'nevermind'
    })

    const saved = await storage.save(competition)
    assert(competition === saved)

    const results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
    assert(results)
  })

  it('should update a competition', async () => {
    const competition = new Competition({
      id: randomId(),
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: 'nevermind',
      contests: [{
        title: 'Juvéniles II E Latines',
        results: {
          'Danny Huck - Louise Jamm': 1,
          'Leon Amiel - Lea Blanchon': 2,
          'Theo Noguera - Eva Gulemirian': 3,
          'Alan Sappa - Louane Piazza': 4
        }
      }]
    })

    // save
    let saved = await storage.save(competition)
    assert(competition === saved)

    let results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
    assert.deepStrictEqual(
      Object.assign({id: results._id}, results),
      Object.assign({_id: competition.id}, competition.toJSON())
    )

    // update
    competition.contests.push({
      title: 'En cours',
      results: {}
    })
    competition.url = 'nevermind 2'
    saved = await storage.save(competition)
    assert(competition === saved)

    results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
    assert.deepStrictEqual(
      Object.assign({id: results._id}, results),
      Object.assign({_id: competition.id}, competition.toJSON())
    )
  })

  // ------- remove
  it('should reject unsupported model during remove', async () => {
    try {
      await storage.remove(new Test())
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('Unsupported model class test'))
      return
    }
    throw new Error('should have failed')
  })

  it('should not fail when removing unsaved models', async () => {
    await storage.remove(new Competition({
      id: randomId(),
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: 'nevermind'
    }))
  })

  it('should remove a competition', async () => {
    const competition = new Competition({
      id: randomId(),
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: 'nevermind'
    })
    await storage.save(competition)

    await storage.remove(competition)

    let fetched = await storage.findById(Competition, competition.id)
    assert(fetched === null)

    const results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
    assert(results === null)
  })

  // ------- findById
  it('should return null when fetching unknown ids', async () => {
    const fetched = await storage.findById(Competition, `${Math.floor(Math.random() * 10000)}`)
    assert(fetched === null)
  })

  it('should retrieve a competition by id', async () => {
    const competition = new Competition({
      id: randomId(),
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: 'nevermind'
    })
    await storage.save(competition)

    let fetched = await storage.findById(Competition, competition.id)
    assert(competition !== fetched)
    assert(fetched instanceof Competition)
    assert.deepStrictEqual(competition.toJSON(), fetched.toJSON())
  })
})
