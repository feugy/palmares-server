const test = require('ava').default
const Storage = require('../../lib/storages/storage')
const {getLogger} = require('../test-utils')

const testOpts = async (t, opts, expected) => {
  const err = t.throws(() => new Storage(opts), Error)
  t.true(err.message.includes(expected))
}
testOpts.title = (providedTitle, opts) => `should reject options: ${JSON.stringify(opts)}`

test(testOpts, undefined, '"opts" is required')
test(testOpts, {}, '"name" is required')
test(testOpts, {name: 10}, '"name" must be a string')
test(testOpts, {name: 'test'}, '"logger" is required')
test(testOpts, {name: 'test', logger: true}, '"logger" must be an object')

const storage = new Storage({name: 'test', logger: getLogger()})

const testMethod = async (t, feature) => {
  const err = await t.throws(storage[feature](), Error)
  t.true(err.message.includes(`test does not implement "${feature}"`))
}
testMethod.title = (providedTitle, feature) => `should report unimplemented ${feature}()`

test(testMethod, 'findById')
test(testMethod, 'find')
test(testMethod, 'save')
test(testMethod, 'remove')
test(testMethod, 'removeAll')
