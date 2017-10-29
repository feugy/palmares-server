const test = require('ava').default
const Provider = require('../../lib/providers/provider')

for (const {opts, expect} of [{
  opts: undefined,
  expect: /"opts" is required/
}, {
  opts: {},
  expect: /"name" is required/
}, {
  opts: {name: 10},
  expect: /"name" must be a string/
}, {
  opts: {name: 'test'},
  expect: /"url" is required/
}, {
  opts: {name: 'test', url: true},
  expect: /"url" must be a string/
}, {
  opts: {name: 'test', url: 'test'},
  expect: /"list" is required/
}, {
  opts: {name: 'test', url: 'test', list: []},
  expect: /"list" must be a string/
}, {
  opts: {name: 'test', url: 'test', list: 'test'},
  expect: /"dateFormat" is required/
}, {
  opts: {name: 'test', url: 'test', list: 'test', dateFormat: {}},
  expect: /"dateFormat" must be a string/
}]) {
  test(`should reject option ${JSON.stringify(opts)}`, t =>
    t.throws(() => new Provider(opts), expect)
  )
}

const provider = new Provider({name: 'test', url: 'test', list: 'test', dateFormat: 'test'})

for (const feature of ['listResults', 'getDetails', 'searchGroups', 'searchCouples', 'getGroupCouples']) {
  test(`should report unimplemented ${feature}()`, async t => {
    const err = await t.throws(provider[feature](), Error)
    t.true(err.message.includes(`test does not implement "${feature}"`))
  })
}
