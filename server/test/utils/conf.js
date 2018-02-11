const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const {resolve} = require('path')
const {readConf} = require('../../lib/utils')
// read env variables
require('dotenv').config()

describe('conf utilities', () => {
  it('should fail to read unknown file ', async () => {
    try {
      await readConf('unknown.yml')
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to load configuration from file unknown.yml'))
      return
    }
    throw new Error('should have failed')
  })

  const root = resolve(__dirname, '..', '..', '..')

  it('should fail to read unparseable file ', async () => {
    try {
      await readConf(resolve(root, 'README.md'))
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to parse configuration from file'))
      assert(err.message.includes('README.md'))
      return
    }
    throw new Error('should have failed')
  })

  it('should manage to read parseable file ', async () => {
    const conf = await readConf(resolve(root, 'package.json'))
    assert(conf.name, 'palmares-server')
    assert(conf.port)
    assert(conf.storage.url)
    assert(conf.auth.key)
  })
})
