const test = require('ava').default
const {Server} = require('hapi')
const moment = require('moment')
const request = require('request-promise-native')
const Competition = require('../../lib/models/competition')
const Palmares = require('../../lib/palmares')
const {
  getFFDSProvider,
  getLogger,
  getMongoStorage,
  getWDSFProvider,
  startFFDSServer,
  startWDSFServer
} = require('../test-utils')

let server
const port = 9874
let ffdsServer
const ffdsPort = 9872
let wdsfServer
const wdsfPort = 9871
const storage = getMongoStorage()
const palmares = new Palmares(storage, [getFFDSProvider(ffdsPort), getWDSFProvider(wdsfPort)], getLogger())

const serialize = (competition, includeContests = true) => {
  const json = competition.toJSON()
  json.date = json.date.toISOString()
  if (!includeContests) {
    json.contests = []
  }
  return json
}

// valid JWT
const authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.J7BKXN08GD4Vh6LqSvnB2LjK91Rcln46mwOkktIB2T8'

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
  // mock servers
  ffdsServer = await startFFDSServer(ffdsPort)
  wdsfServer = await startWDSFServer(wdsfPort)

  // save competitions into storage
  await Promise.all(competitions.map(c => storage.save(c)))

  // server for api testing
  server = new Server({
    port,
    routes: {
      validate: {
        failAction: (request, h, err) => {
          throw err
        }
      }
    },
    debug: false // {request: ['error']}
  })
  server.decorate('request', 'storage', storage)
  server.decorate('request', 'palmares', palmares)
  await server.register([{
    plugin: require('../../lib/plugins/authentication'),
    options: { key: process.env.JWT_KEY }
  }, require('../../lib/plugins/competition')])
  await server.start()
})

test.after.always(async () => {
  await storage.removeAll(Competition)
  await server.stop()
  await ffdsServer.stop()
  await wdsfServer.stop()
})

const testQuery = async (t, input, expected) => {
  const {error} = await t.throws(request({url: `http://localhost:${port}/api/competition?${input}`, json: true}))
  t.is(error.statusCode, 400)
  t.true(error.message.includes(expected))
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

test('should not update without JWT', async t => {
  const {error} = await t.throws(request({
    method: 'PUT',
    url: `http://localhost:${port}/api/competition/update`,
    json: true
  }))
  t.is(error.statusCode, 401)
  t.true(error.message.includes('Missing authentication'))
})

test('should not update with invalid JWT', async t => {
  const {error} = await t.throws(request({
    method: 'PUT',
    headers: {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.LwimMJA3puF3ioGeS-tfczR3370GXBZMIL-bdpu4hOU'
    },
    url: `http://localhost:${port}/api/competition/update`,
    json: true
  }))
  t.is(error.statusCode, 401)
  t.true(error.message.includes('Invalid token'))
})

test('should update competition list of a given year, then report update errors', async t => {
  const result = await request({
    method: 'PUT',
    headers: { authorization },
    url: `http://localhost:${port}/api/competition/update?year=2012`,
    json: true
  })
  t.deepEqual(result, {
    year: 2012,
    FFDS: [{
      place: 'Marseille',
      date: '2013-03-22T23:00:00.000Z',
      id: '21f4eb195bc7de2678b1fb8665d79a28'
    }],
    WDSF: [{
      place: 'San Lazzaro Di Savena',
      date: '2013-01-04T00:00:00.000Z',
      id: 'b38521030e81c5ddcc7cdeebbe4fe14f'
    }, {
      place: 'San Lazzaro Di Savena',
      date: '2013-01-05T00:00:00.000Z',
      id: 'a99655379239a76d8c93e4b94311fd19'
    }, {
      place: 'Kiev',
      date: '2013-11-23T00:00:00.000Z',
      id: 'b491e2d9ffcef71468ac9b676696d220'
    }, {
      place: 'Kiev',
      date: '2013-11-24T00:00:00.000Z',
      id: '4aee29e66d0644c811b8babaf30e3be8'
    }]
  })

  const {error} = await t.throws(request({
    method: 'PUT',
    headers: { authorization },
    url: `http://localhost:${port}/api/competition/update?year=2018`,
    json: true
  }))
  t.is(error.statusCode, 404)
  t.true(error.message.includes('failed to fetch results from WDSF'))
})
