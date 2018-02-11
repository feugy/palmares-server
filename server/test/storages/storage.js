const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const Storage = require('../../lib/storages/storage')
const {getLogger} = require('../test-utils')

describe('generic storage', () => {
  const fixtures = [{
    input: undefined, expected: '"opts" is required'
  }, {
    input: {}, expected: '"name" is required'
  }, {
    input: {name: 10}, expected: '"name" must be a string'
  }, {
    input: {name: 'test'}, expected: '"logger" is required'
  }, {
    input: {name: 'test', logger: true}, expected: '"logger" must be an object'
  }]

  fixtures.forEach(({input, expected}) => {
    it(`should reject options: ${JSON.stringify(input)}`, () => {
      try {
        new Storage(input)
      } catch (err) {
        assert(err instanceof Error)
        assert(err.message.includes(expected))
        return
      }
      throw new Error('should have failed')
    })
  })

  const storage = new Storage({name: 'test', logger: getLogger()})

  const features = [
    'findById',
    'find',
    'save',
    'remove',
    'removeAll'
  ]
  features.forEach(feature => {
    it(`should report unimplemented ${feature}()`, async () => {
      try {
        await storage[feature]()
      } catch (err) {
        assert(err instanceof Error)
        assert(err.message.includes(`test does not implement "${feature}"`))
        return
      }
      throw new Error('should have failed')
    })
  })
})
