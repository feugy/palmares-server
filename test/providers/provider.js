const Lab = require('lab')
const assert = require('power-assert')
const Provider = require('../../lib/providers/provider')
const lab = exports.lab = Lab.script()
const {describe, it, before} = lab

describe('Provider class', () => {
  [{
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
  }].forEach(({opts, expect}) => {
    it(`should rejection option ${JSON.stringify(opts)}`, done => {
      assert.throws(() => new Provider(opts), expect)
      done()
    })
  })

  describe('given a provider', () => {
    let provider

    before(done => {
      provider = new Provider({name: 'test', url: 'test', list: 'test', dateFormat: 'test'})
      done()
    })

    for (const feature of ['listResults', 'getDetails', 'searchGroups', 'searchCouples', 'getGroupCouples']) {
      it(`should report unimplemented ${feature}()`, () =>
        provider[feature]().then(res => {
          throw new Error(`unexpected results: ${JSON.stringify(res)}`)
        }, err => {
          assert(err instanceof Error)
          assert(err.message.includes(`test does not implement "${feature}"`))
        })
      )
    }
  })
})
