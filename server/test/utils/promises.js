const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const {promisify} = require('util')
const setTimeoutPromise = promisify(setTimeout)
const {runSerially, runWithPool} = require('../../lib/utils')

describe('conf utilities', () => {
  it('should run promises serially', async () => {
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
    assert.deepStrictEqual(order, [1, 2])
    assert.deepStrictEqual(result, [1, 2])
  })

  it('should runSerially bail on first error', async () => {
    const order = []
    try {
      await runSerially([
        async () => order.push(1),
        async () => { throw new Error('fail on 2') },
        async () => order.push(3)
      ])
    } catch (err) {
      assert(err instanceof Error)
      assert.deepStrictEqual(order, [1])
      assert(err.message.includes('fail on 2'))
      return
    }
    throw new Error('should have failed')
  })

  it('should run promises in pools', async () => {
    const order = []
    const result = await runWithPool(
      Array.from({length: 10})
        .map((unused, i) => async () => {
          await setTimeoutPromise(Math.random() * 100)
          order.push(i)
          return i
        })
      , 3)
    assert(order.length === 10)
    assert.deepStrictEqual(result, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('should runWithPool bail on first error', async () => {
    const order = []
    try {
      await runWithPool(
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
    } catch (err) {
      assert(err instanceof Error)
      assert(order.length !== 10)
      assert(err.message.includes('fail on 5'))
      return
    }
    throw new Error('should have failed')
  })
})
