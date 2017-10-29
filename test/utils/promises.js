const test = require('ava').default
const {runSerially} = require('../../lib/utils')

test('should run promises serially', async t => {
  const order = []
  const result = await runSerially([
    () => {
      order.push(1)
      return Promise.resolve(1)
    },
    () => {
      order.push(2)
      return Promise.resolve(2)
    }
  ])
  t.deepEqual(order, [1, 2])
  t.deepEqual(result, [1, 2])
})

test('should bail on first error', async t => {
  const order = []
  const err = await t.throws(runSerially([
    () => {
      order.push(1)
      return Promise.resolve()
    },
    () => Promise.reject(new Error('fail on 2')),
    () => {
      order.push(3)
      return Promise.resolve()
    }
  ]))
  t.deepEqual(order, [1])
  t.true(err instanceof Error)
  t.true(err.message.includes('fail on 2'))
})
