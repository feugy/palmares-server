
const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const {promisify} = require('util')
const {resolve} = require('path')
const rimraf = promisify(require('rimraf'))
const {merge} = require('lodash/fp')
const request = require('request-promise-native')
const access = promisify(require('fs').access)
const npm = require('global-npm')
const {readConf} = require('../lib/utils')
const startServer = require('../lib/server')
// read env variables
require('dotenv').config()

const confPath = resolve(__dirname, '..', '..', 'conf', 'test.yml')

describe('server', () => {
  [{
    input: {}, expected: '"port" is required'
  }, {
    input: {port: 10.5}, expected: '"port" must be an integer'
  }, {
    input: {port: 0, storage: {name: true}}, expected: '"name" must be a string'
  }, {
    input: {port: 0, storage: {name: 'bla'}}, expected: '"name" must be one of'
  }, {
    input: {port: 0, storage: {name: 'Mongo'}, providers: 10}, expected: '"providers" must be an array'
  }, {
    input: {port: 0, storage: {name: 'Mongo'}, providers: ['bla']}, expected: '"0" must be an object'
  }, {
    input: {port: 0, storage: {name: 'Mongo'}, providers: [{name: 'bla'}]}, expected: '"name" must be one of'
  }, {
    input: {port: 0, storage: {name: 'Mongo'}, providers: []}, expected: '"auth" is required'
  }, {
    input: {port: 0, storage: {name: 'Mongo'}, providers: [], auth: {}}, expected: '"key" is required'
  }, {
    input: {port: 0, storage: {name: 'Mongo'}, providers: [], auth: {key: 10}}, expected: '"key" must be a string'
  }].forEach(({input, expected}) => {
    it(`should not build with option: ${JSON.stringify(input)}`, async () => {
      try {
        await startServer(input)
      } catch (err) {
        assert(err instanceof Error)
        assert(err.message.includes(expected))
        return
      }
      throw new Error('should have failed')
    })
  })

  const clientDist = resolve(__dirname, '..', '..', 'client', 'dist')

  it('should be started with all options', {timeout: 60e3}, async () => {
    // builds client if needed
    try {
      await access(resolve(clientDist, 'index.html'))
    } catch (err) {
      await promisify(npm.load)({})
      await promisify(npm.commands.run)(['build'])
    }

    const port = 9873
    const server = await startServer(merge(await readConf(confPath))({port, isProd: true}))

    await request({url: `http://localhost:${port}/api/competition`, json: true})
    let result = await request({url: `http://localhost:${port}/`})
    await server.stop()
    assert(result.includes('body'))
  })

  it('should only render server side with dist', async t => {
    const port = 9870
    // remove dist client
    try {
      await rimraf(clientDist)
    } catch (err) {
      // ignore error if dist doesn't exist
    }

    try {
      await startServer(merge(await readConf(confPath))({port, isProd: true}))
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('no such file or directory'))
      assert(err.message.includes('index.html'))
      return
    }
    throw new Error('should have failed')
  })
})
