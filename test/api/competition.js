const test = require('ava').default
const {Server} = require('hapi')
const moment = require('moment')
const request = require('request-promise-native')
const Competition = require('../../lib/models/competition')
const {getMongoStorage} = require('../_test-utils')

let server
const port = 9874
const storage = getMongoStorage()

const serialize = (competition, includeContests = true) => {
  const json = competition.toJSON()
  json.date = json.date.toISOString()
  if (!includeContests) {
    json.contests = []
  }
  return json
}

const competitions = [
  new Competition({
    id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
    date: moment('2013-08-13'),
    provider: 'FFDS',
    place: 'Lillebonne',
    url: 'nevermind',
    contests: [{
      title: 'Adultes C Latines',
      results: {
        'Leonardo Lini - Mia Gabusi': 1,
        'Samuel Santarelli - Alexandra Leone': 2,
        'Alessio Russo - Antonella Carrieri': 3,
        'Leonardo Marinelli - Aurora Pacetti': 4,
        'Rodolfo Gentilini - Beatrice Fabi': 5
      }
    }]
  }),
  new Competition({
    id: '45ca729adf5a8b963b73bbd6197d3a32',
    date: moment('2013-02-16'),
    provider: 'FFDS',
    place: 'Illzach',
    url: 'nevermind',
    contests: [{
      title: 'Championnat Régional Adultes A B C D E Latines',
      results: {
        'David Merenguer Torres - Juline Carrel': 1,
        'Theophile Sanson - Lorraine Prevel': 2,
        'Guillaume Lancien - Ludivine Sanson': 3,
        'Valentin Edde - Faustine Aydar': 4
      }
    }]
  }),
  new Competition({
    id: '7a217757907283d497436854677adabd',
    place: 'San Lazzaro Di Savena (bologna)',
    date: moment.utc('2013-01-04'),
    provider: 'WDSF',
    url: `nevermind`,
    contests: [{
      title: 'Junior II Latin Open',
      results: {
        'Dung Vo - Sonja Dragutinovic': 1,
        'Valentin Edde - Faustine Aydar': 2
      }
    }]
  })
]

test.before(async () => {
  server = new Server()
  server.connection({port})
  server.decorate('request', 'storage', storage)
  await Promise.all(competitions.map(c => storage.save(c)))
  await server.register(require('../../lib/api/competition'))
  await server.start()
})

test.after.always(async () => {
  await storage.removeAll(Competition)
  await server.stop()
})

const testQuery = async (t, input, expected) => {
  const {error} = await t.throws(request({url: `http://localhost:${port}/api/competition?${input}`, json: true}))
  t.true(error.message.includes(expected))
  t.is(error.statusCode, 400)
}
testQuery.title = (providedTitle, input, expected) => `should reject query: ${input}`

test(testQuery, 'provider=bla', '"provider" must be one of')
test(testQuery, 'provider=10', '"provider" must be one of')
test(testQuery, 'size=bla', '"size" must be a number')
test(testQuery, 'size=10.5', '"size" must be an integer')
test(testQuery, 'offset=bla', '"offset" must be a number')
test(testQuery, 'offset=10.5', '"offset" must be an integer')

test('should list competitions', async t => {
  const result = await request({url: `http://localhost:${port}/api/competition`, json: true})
  t.is(result.offset, 0)
  t.is(result.size, competitions.length)
  t.deepEqual(result.values, competitions.map(c => serialize(c, false)))
})

test('should list competitions with pagination', async t => {
  const result = await request({url: `http://localhost:${port}/api/competition?offset=1&size=1`, json: true})
  t.is(result.offset, 1)
  t.is(result.size, 1)
  t.deepEqual(result.values, [serialize(competitions[1], false)])
})

test('should list competitions by provider', async t => {
  const desired = 'FFDS'
  const result = await request({url: `http://localhost:${port}/api/competition?provider=${desired}`, json: true})
  const expected = competitions.filter(({provider}) => provider === desired)
  t.is(result.offset, 0)
  t.is(result.size, expected.length)
  t.deepEqual(result.values, expected.map(c => serialize(c, false)))
})

test('should access competition by id', async t => {
  const result = await request({url: `http://localhost:${port}/api/competition/${competitions[0].id}`, json: true})
  t.deepEqual(result, serialize(competitions[0]))
})

test('should return 404 on unknown competition', async t => {
  const {error} = await t.throws(request({url: `http://localhost:${port}/api/competition/whatever`, json: true}))
  t.is(error.statusCode, 404)
  t.true(error.message.includes('no competition with id'))
})
