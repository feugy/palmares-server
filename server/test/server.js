const test = require('ava').default
const {promisify} = require('util')
const {resolve} = require('path')
const rimraf = promisify(require('rimraf'))
const exec = promisify(require('npm-run').exec)
const {merge} = require('lodash/fp')
const request = require('request-promise-native')
const {readConf} = require('../lib/utils')
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
test(testOpts, {port: 0, storage: {name: 'Mongo'}, providers: []}, '"auth" is required')
test(testOpts, {port: 0, storage: {name: 'Mongo'}, providers: [], auth: {}}, '"key" is required')
test(testOpts, {port: 0, storage: {name: 'Mongo'}, providers: [], auth: {key: 10}}, '"key" must be a string')

const confPath = resolve(__dirname, '..', '..', 'conf', 'test.yml')

test('should be started with all options', async t => {
  const port = 9873
  const server = await startServer(merge(await readConf(confPath))({port}))

  await request({url: `http://localhost:${port}/api/competition`, json: true})
  await server.stop()
  t.pass()
})

test('should only render server side with dist', async t => {
  const port = 9870
  // remove dist client
  try {
    await rimraf(resolve(__dirname, '..', '..', 'client', 'dist'))
  } catch (err) {
    // ignore error if dist doesn't exist
  }

  // start server, and request root page, which shouldn't exist
  let server = await startServer(merge(await readConf(confPath))({port}))
  let result = await request({url: `http://localhost:${port}/`, simple: false, json: true})
  await server.stop()
  t.is(result.statusCode, 404)

  // builds client. For unknown reason, Ava mess with npm, and we can't exec `npm run build` from tests
  await exec('bankai build client')

  // restart server (to reload dist client), and request root page, which should exist
  server = await startServer(merge(await readConf(confPath))({port}))
  result = await request({url: `http://localhost:${port}/`})
  await server.stop()
  t.true(result.includes('body'))
})
