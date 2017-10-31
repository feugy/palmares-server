const test = require('ava').default
const moment = require('moment')
const {MongoClient} = require('mongodb')
const {randomBytes} = require('crypto')
const MongoStorage = require('../../lib/storages/mongodb')
const Competition = require('../../lib/models/competition')
const {getMongoStorage, getLogger} = require('../_test-utils')

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
  const db = await MongoClient.connect(storage.opts.url)
  try {
    const col = await db.collection(collection + storage.opts.suffix)
    const results = await col[operation](...args)
    await db.close()
    return results
  } catch (err) {
    await db.close()
    throw err
  }
}

test.beforeEach(t => {
  t.context.storage = getMongoStorage()
})

// deletes entire collection after all tests
test.afterEach.always(async t => {
  try {
    await runOperation(t.context.storage, 'competition', 'drop')
  } catch (err) {
    // ignore errors when deleting
  }
})

// ------- constructor
test('should fail when build without required options', t => {
  const err = t.throws(() => new MongoStorage({logger: getLogger()}), Error)
  t.true(err.message.includes('"url" is required'))
})

// ------- find
test('should return empty results on empty model collection', async t => {
  const {storage} = t.context
  try {
    await runOperation(storage, 'competition', 'drop')
  } catch (err) {
    // ignore
  }
  const fetched = await storage.find(Competition)
  t.is(fetched.length, 0)
})

test('should return all models', async t => {
  const {storage} = t.context
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
  t.true(fetched.length >= 2)

  let competition = fetched.find(c => c.id === insertedIds[0])
  t.false(competition === undefined)
  t.is(competition.place, 'Marseille')

  competition = fetched.find(c => c.id === insertedIds[1])
  t.false(competition === undefined)
  t.is(competition.place, 'Lille')
})

test('should return all by query', async t => {
  const {storage} = t.context
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
  t.true(fetched.length >= 2)

  let competition = fetched.find(c => c.id === insertedIds[0])
  t.false(competition === undefined)

  competition = fetched.find(c => c.id === insertedIds[1])
  t.is(competition, undefined)

  competition = fetched.find(c => c.id === insertedIds[2])
  t.false(competition === undefined)
})

test('should handle disconnection error when finding model', async t => {
  const err = await t.throws(disconnectedStorage.find(Competition), Error)
  t.true(err.message.includes('failed to connect to server'))
})

// ------- removeAll
test('should drop empty model collection', async t => {
  const result = await t.context.storage.removeAll(Competition)
  t.is(result, undefined)
})

test('should handle disconnection error when removing all models', async t => {
  const err = await t.throws(disconnectedStorage.removeAll(Competition), Error)
  t.true(err.message.includes('failed to connect to server'))
})

// ------- save
test('should reject unsupported model during save', async t => {
  const err = await t.throws(t.context.storage.save(new Test()), Error)
  t.true(err.message.includes('Unsupported model class test'))
})

test('should save a competition', async t => {
  const {storage} = t.context
  const competition = new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  })

  const saved = await storage.save(competition)
  t.is(competition, saved)

  const results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
  t.false(results === null)
})

test('should update a competition', async t => {
  const {storage} = t.context
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
  t.is(competition, saved)

  let results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
  t.deepEqual(
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
  t.is(competition, saved)

  results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
  t.deepEqual(
    Object.assign({id: results._id}, results),
    Object.assign({_id: competition.id}, competition.toJSON())
  )
})

// ------- remove
test('should reject unsupported model during remove', async t => {
  const err = await t.throws(t.context.storage.remove(new Test()), Error)
  t.true(err.message.includes('Unsupported model class test'))
})

test('should not fail when removing unsaved models', async t => {
  await t.context.storage.remove(new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  }))
  t.pass()
})

test('should remove a competition', async t => {
  const {storage} = t.context
  const competition = new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  })
  await storage.save(competition)

  await storage.remove(competition)

  let fetched = await storage.findById(Competition, competition.id)
  t.is(fetched, null)

  const results = await runOperation(storage, 'competition', 'findOne', {_id: competition.id})
  t.is(results, null)
})

// ------- findById
test('should return null when fetching unknown ids', async t => {
  const fetched = await t.context.storage.findById(Competition, `${Math.floor(Math.random() * 10000)}`)
  t.is(fetched, null)
})

test('should retrieve a competition by id', async t => {
  const {storage} = t.context
  const competition = new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  })
  await storage.save(competition)

  let fetched = await storage.findById(Competition, competition.id)
  t.false(competition === fetched)
  t.true(fetched instanceof Competition)
  t.deepEqual(competition.toJSON(), fetched.toJSON())
})
