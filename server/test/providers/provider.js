const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const Provider = require('../../lib/providers/provider')
const {getLogger} = require('../test-utils')

describe('generic provider', () => {
  const logger = {}
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
  }, {
    input: {name: 'test', logger}, expected: '"url" is required'
  }, {
    input: {name: 'test', logger, url: true}, expected: '"url" must be a string'
  }, {
    input: {name: 'test', logger, url: 'test'}, expected: '"list" is required'
  }, {
    input: {name: 'test', logger, url: 'test', list: []}, expected: '"list" must be a string'
  }, {
    input: {name: 'test', logger, url: 'test', list: 'test'}, expected: '"dateFormat" is required'
  }, {
    input: {name: 'test', logger, url: 'test', list: 'test', dateFormat: {}}, expected: '"dateFormat" must be a string'
  }]

  fixtures.forEach(({input, expected}) => {
    it(`should reject options: ${JSON.stringify(input)}`, () => {
      try {
        new Provider(input)
      } catch (err) {
        assert(err instanceof Error)
        assert(err.message.includes(expected))
        return
      }
      throw new Error('should have failed')
    })
  })

  const provider = new Provider({name: 'test', logger: getLogger(), url: 'test', list: 'test', dateFormat: 'test'})

  const features = [
    'listResults',
    'getDetails',
    'searchGroups',
    'searchCouples',
    'getGroupCouples'
  ]
  features.forEach(feature => {
    it(`should report unimplemented ${feature}()`, async () => {
      try {
        await provider[feature]()
      } catch (err) {
        assert(err instanceof Error)
        assert(err.message.includes(`test does not implement "${feature}"`))
        return
      }
      throw new Error('should have failed')
    })
  })
})
