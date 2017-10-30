const test = require('ava').default
const moment = require('moment')
const {MongoClient} = require('mongodb')
const {randomBytes} = require('crypto')
const MongoStorage = require('../../lib/storages/mongodb')
const Competition = require('../../lib/models/competition')

// read env variables
require('dotenv').config()
if (!('MONGO_URL' in process.env)) {
  throw new Error('Please set MONGO_URL as environment variable')
}
const storage = new MongoStorage({url: process.env.MONGO_URL})
const disconnectedStorage = new MongoStorage({url: 'mongodb://unknown:6541/unknown'})
class Test {}

/**
 * Generates random hxadecimal id
 * @returns {String} random id of 32 characters
 */
const randomId = () => randomBytes(16).toString('hex').slice(0, 32)

/**
 * Run a given operation on a collection
 * @param {String} collection - collection operated
 * @param {String} operation - operation run on collection (find, insert...)
 * @param {..any} args - arguments for the operation itself
 */
const runOperation = async (collection, operation, ...args) => {
  const db = await MongoClient.connect(storage.opts.url)
  const col = await db.collection(collection)
  const results = await col[operation](...args)
  await db.close()
  return results
}

// deletes entire collection after all tests
test.after.always(async t => runOperation('competition', 'drop'))

// deletes created documents after each tests
test.afterEach.always(async t => {
  if (t.context.created && t.context.created.length) {
    await runOperation('competition', 'deleteMany', {_id: {$in: t.context.created}})
  }
})

// ------- constructor
test('should fail when build without required options', t => {
  let err = t.throws(() => new MongoStorage(), Error)
  t.true(err.message.includes('"opts" is required'))

  err = t.throws(() => new MongoStorage({}), Error)
  t.true(err.message.includes('"url" is required'))
})

// ------- find
test.serial('should return empty results on empty model collection', async t => {
  const fetched = await storage.find(Competition)
  t.true(fetched.length === 0)
})

test('should return all models', async t => {
  const {insertedIds} = await runOperation('competition', 'insertMany', [{
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
  t.context.created = insertedIds

  const fetched = await storage.find(Competition)
  t.true(fetched.length >= 2)

  let competition = fetched.find(c => c.id === insertedIds[0])
  t.false(competition === undefined)
  t.true(competition.place === 'Marseille')

  competition = fetched.find(c => c.id === insertedIds[1])
  t.false(competition === undefined)
  t.true(competition.place === 'Lille')
})

test('should return all by query', async t => {
  const {insertedIds} = await runOperation('competition', 'insertMany', [{
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
  t.context.created = insertedIds

  const fetched = await storage.find(Competition, {place: 'Paris'})
  t.true(fetched.length >= 2)

  let competition = fetched.find(c => c.id === insertedIds[0])
  t.false(competition === undefined)

  competition = fetched.find(c => c.id === insertedIds[1])
  t.true(competition === undefined)

  competition = fetched.find(c => c.id === insertedIds[2])
  t.false(competition === undefined)
})

test('should handle disconnection error when finding model', async t => {
  const err = await t.throws(disconnectedStorage.find(Competition), Error)
  t.true(err.message.includes('failed to connect to server'))
})

// ------- removeAll
test.serial('should drop empty model collection', async t => {
  const result = await storage.removeAll(Competition)
  t.true(result === undefined)
})

test('should handle disconnection error when removing all models', async t => {
  const err = await t.throws(disconnectedStorage.removeAll(Competition), Error)
  t.true(err.message.includes('failed to connect to server'))
})

// ------- save
test('should reject unsupported model during save', async t => {
  const err = await t.throws(storage.save(new Test()), Error)
  t.true(err.message.includes('Unsupported model class test'))
})

test('should save a competition', async t => {
  const competition = new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  })
  t.context.created = [competition.id]

  const saved = await storage.save(competition)
  t.true(competition === saved)

  const results = await runOperation('competition', 'findOne', {_id: competition.id})
  t.false(results === null)
})

test('should update a competition', async t => {
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
  t.context.created = [competition.id]

  // save
  let saved = await storage.save(competition)
  t.true(competition === saved)

  let results = await runOperation('competition', 'findOne', {_id: competition.id})
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
  t.true(competition === saved)

  results = await runOperation('competition', 'findOne', {_id: competition.id})
  t.deepEqual(
    Object.assign({id: results._id}, results),
    Object.assign({_id: competition.id}, competition.toJSON())
  )
})

// ------- remove
test('should reject unsupported model during remove', async t => {
  const err = await t.throws(storage.remove(new Test()), Error)
  t.true(err.message.includes('Unsupported model class test'))
})

test('should not fail when removing unsaved models', async t => {
  await storage.remove(new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  }))
  t.pass()
})

test('should remove a competition', async t => {
  const competition = new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  })
  t.context.created = [competition.id]
  await storage.save(competition)

  await storage.remove(competition)

  let fetched = await storage.findById(Competition, competition.id)
  t.true(fetched === null)

  const results = await runOperation('competition', 'findOne', {_id: competition.id})
  t.true(results === null)
})

// ------- findById
test('should return null when fetching unknown ids', async t => {
  const fetched = await storage.findById(Competition, `${Math.floor(Math.random() * 10000)}`)
  t.true(fetched === null)
})

test('should retrieve a competition by id', async t => {
  const competition = new Competition({
    id: randomId(),
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: 'nevermind'
  })
  t.context.created = [competition.id]
  await storage.save(competition)

  let fetched = await storage.findById(Competition, competition.id)
  t.false(competition === fetched)
  t.true(fetched instanceof Competition)
  t.deepEqual(competition.toJSON(), fetched.toJSON())
})
