const Lab = require('lab')
const assert = require('power-assert')
const {runSerially} = require('../../lib/utils')
const lab = exports.lab = Lab.script()
const {describe, it} = lab

describe('Promises utility', () => {
  it('should run promises serially', () => {
    const order = []
    return runSerially([
      () => {
        order.push(1)
        return Promise.resolve(1)
      },
      () => {
        order.push(2)
        return Promise.resolve(2)
      }
    ]).then(result => {
      assert.deepStrictEqual(order, [1, 2])
      assert.deepStrictEqual(result, [1, 2])
    })
  })

  it('should bail on first error', () => {
    const order = []
    return runSerially([
      () => {
        order.push(1)
        return Promise.resolve()
      },
      () => Promise.reject(new Error('fail on 2')),
      () => {
        order.push(3)
        return Promise.resolve()
      }
    ]).then(result => {
      throw new Error(`Unexpected results: ${JSON.stringify(result)}`)
    }, err => {
      assert.deepStrictEqual(order, [1])
      assert(err instanceof Error)
      assert(err.message.includes('fail on 2'))
    })
  })
})
