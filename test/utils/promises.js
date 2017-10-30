const test = require('ava').default
const {promisify} = require('util')
const setTimeoutPromise = promisify(setTimeout)
const {runSerially, runWithPool} = require('../../lib/utils')

test('should run promises serially', async t => {
  const order = []
  const result = await runSerially([
    async () => {
      order.push(1)
      return 1
    },
    async () => {
      order.push(2)
      return 2
    }
  ])
  t.deepEqual(order, [1, 2])
  t.deepEqual(result, [1, 2])
})

test('should runSerially bail on first error', async t => {
  const order = []
  const err = await t.throws(runSerially([
    async () => order.push(1),
    async () => { throw new Error('fail on 2') },
    async () => order.push(3)
  ]), Error)
  t.deepEqual(order, [1])
  t.true(err.message.includes('fail on 2'))
})

test('should run promises in pools', async t => {
  const order = []
  const result = await runWithPool(
    Array.from({length: 10})
      .map((unused, i) => async () => {
        await setTimeoutPromise(Math.random() * 100)
        order.push(i)
        return i
      })
    , 3)
  t.true(order.length === 10)
  t.deepEqual(result, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('should runWithPool bail on first error', async t => {
  const order = []
  const err = await t.throws(runWithPool(
    Array.from({length: 10})
      .map((unused, i) => async () => {
        if (i === 5) {
          throw new Error('fail on 5')
        }
        await setTimeoutPromise(Math.random() * 100)
        order.push(i)
        return i
      })
    , 3)
    , Error)
  t.false(order.length === 10)
  t.true(err.message.includes('fail on 5'))
})
