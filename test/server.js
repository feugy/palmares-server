const test = require('ava').default
const request = require('request-promise-native')
const startServer = require('../lib/server')
// read env variables
require('dotenv').config()

const testOpts = async (t, opts, expected) => {
  const err = await t.throws(startServer(opts), Error)
  t.true(err.message.includes(expected))
}
testOpts.title = (providedTitle, input, expected) => `should not build with option: ${JSON.stringify(input)}`

test(testOpts, {}, '"port" is required')
test(testOpts, {port: 10.5}, '"port" must be an integer')
test(testOpts, {port: 0, storage: {name: true}}, '"name" must be a string')
test(testOpts, {port: 0, storage: {name: 'bla'}}, '"name" must be one of')
test(testOpts, {port: 0, storage: {name: 'Mongo'}, providers: 10}, '"providers" must be an array')
test(testOpts, {port: 0, storage: {name: 'Mongo'}, providers: ['bla']}, '"0" must be an object')
test(testOpts, {port: 0, storage: {name: 'Mongo'}, providers: [{name: 'bla'}]}, '"name" must be one of')

test('should be started with all options', async t => {
  const port = 9873
  const server = await startServer({
    port,
    storage: {
      name: 'Mongo',
      url: process.env.MONGO_URL
    },
    providers: [{
      name: 'FFDS',
      url: 'unknown',
      list: 'compet-resultats.php',
      details: 'compet-resultats.php?NumManif=%1$s',
      clubs: 'compet-situation.php',
      couples: 'compet-situation.php?club_id=%1s&Recherche_Club=',
      search: 'compet-situation.php?couple_name=%1$s&Recherche_Nom=',
      dateFormat: 'DD/MM/YYYY'
    }, {
      name: 'WDSF',
      url: 'unknown',
      list: 'Calendar/Competition/Results?format=csv&downloadFromDate=01/01/%1$s&downloadToDate=31/12/%1$s&kindFilter=Competition',
      dateFormat: 'YYYY/MM/DD'
    }]
  })

  const result = await request({url: `http://localhost:${port}/api/competition`, json: true})
  await server.stop()

  t.is(result.offset, 0)
  t.is(result.size, 0)
  t.deepEqual(result.values, [])
})
