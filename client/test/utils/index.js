const test = require('ava').default
const {performance} = require('perf_hooks')
const {timeout} = require('../../lib/utils')

test('should timeout be asynchronous', async t => {
  const start = performance.now()
  await timeout()
  t.true(performance.now() - start > 0)
})

test('should timeout run after N milliseconds', async t => {
  const start = performance.now()
  await timeout(10)
  t.true(performance.now() - start >= 10)
})
