const test = require('ava').default
const {readConf} = require('../../lib/utils')
// read env variables
require('dotenv').config()

test('should fail to read unknown file ', async t => {
  const err = await t.throws(readConf('unknown.yml'), Error)
  t.true(err.message.includes('failed to load configuration from file unknown.yml'))
})

test('should fail to read unparseable file ', async t => {
  const err = await t.throws(readConf('README.md'), Error)
  t.true(err.message.includes('failed to parse configuration from file README.md'))
})

test('should manage to read parseable file ', async t => {
  const conf = await readConf('package.json')
  t.is(conf.name, 'palmares-server')
  t.false(conf.port === undefined)
  t.false(conf.storage.url === undefined)
  t.false(conf.auth.key === undefined)
})
