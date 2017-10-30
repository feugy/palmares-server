const test = require('ava').default
const Storage = require('../../lib/storages/storage')

for (const {opts, expect} of [{
  opts: undefined,
  expect: /"opts" is required/
}, {
  opts: {},
  expect: /"name" is required/
}, {
  opts: {name: 10},
  expect: /"name" must be a string/
}]) {
  test(`should reject option ${JSON.stringify(opts)}`, t =>
    t.throws(() => new Storage(opts), expect)
  )
}

const storage = new Storage({name: 'test'})

for (const feature of ['findById', 'find', 'save', 'remove', 'removeAll']) {
  test(`should report unimplemented ${feature}()`, async t => {
    const err = await t.throws(storage[feature](), Error)
    t.true(err.message.includes(`test does not implement "${feature}"`))
  })
}
