const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const {performance} = require('perf_hooks')
const {timeout} = require('../../lib/utils')

describe('utilities', () => {
  it('should timeout be asynchronous', async () => {
    const start = performance.now()
    await timeout()
    assert(performance.now() - start > 0)
  })

  it('should timeout run after N milliseconds', async () => {
    const start = performance.now()
    await timeout(10)
    assert(performance.now() - start >= 9)
  })
})
