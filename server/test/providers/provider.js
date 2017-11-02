const test = require('ava').default
const Provider = require('../../lib/providers/provider')
const {getLogger} = require('../test-utils')

const testOpts = async (t, opts, expected) => {
  const err = t.throws(() => new Provider(opts), Error)
  t.true(err.message.includes(expected))
}
testOpts.title = (providedTitle, opts) => `should reject options: ${JSON.stringify(opts)}`

const logger = {}
test(testOpts, undefined, '"opts" is required')
test(testOpts, {}, '"name" is required')
test(testOpts, {name: 10}, '"name" must be a string')
test(testOpts, {name: 'test'}, '"logger" is required')
test(testOpts, {name: 'test', logger: true}, '"logger" must be an object')
test(testOpts, {name: 'test', logger}, '"url" is required')
test(testOpts, {name: 'test', logger, url: true}, '"url" must be a string')
test(testOpts, {name: 'test', logger, url: 'test'}, '"list" is required')
test(testOpts, {name: 'test', logger, url: 'test', list: []}, '"list" must be a string')
test(testOpts, {name: 'test', logger, url: 'test', list: 'test'}, '"dateFormat" is required')
test(testOpts, {name: 'test', logger, url: 'test', list: 'test', dateFormat: {}}, '"dateFormat" must be a string')

const provider = new Provider({name: 'test', logger: getLogger(), url: 'test', list: 'test', dateFormat: 'test'})

const testMethod = async (t, feature) => {
  const err = await t.throws(provider[feature](), Error)
  t.true(err.message.includes(`test does not implement "${feature}"`))
}
testMethod.title = (providedTitle, feature) => `should report unimplemented ${feature}()`

test(testMethod, 'listResults')
test(testMethod, 'getDetails')
test(testMethod, 'searchGroups')
test(testMethod, 'searchCouples')
test(testMethod, 'getGroupCouples')
