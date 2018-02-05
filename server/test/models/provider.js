const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const moment = require('moment')
const Competition = require('../../lib/models/competition')

describe('Competition model', () => {
  it('should not build instance without options', () => {
    try {
      new Competition()
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('no id provided'))
      return
    }
    throw new Error('should have failed')
  })

  it('should not build instance without ids', () => {
    try {
      new Competition({})
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('no id provided'))
      return
    }
    throw new Error('should have failed')
  })

  it('should url take precedence over string dataUrls', () => {
    const competition = new Competition({id: '', url: 'url1', dataUrls: 'url2'})
    assert(competition.url === 'url1')
    assert.deepStrictEqual(competition.dataUrls, ['url1'])
  })

  it('should url take precedence over empty dataUrls', () => {
    const competition = new Competition({id: '', url: 'url1'})
    assert(competition.url === 'url1')
    assert.deepStrictEqual(competition.dataUrls, ['url1'])
  })

  it('should url not take precedence over array dataUrls', () => {
    const competition = new Competition({id: '', url: 'url1', dataUrls: ['url2']})
    assert(competition.url === 'url1')
    assert.deepStrictEqual(competition.dataUrls, ['url2'])
  })

  it('should serialize competitions', () => {
    const raw = {id: 'id', url: 'url1', date: '2017-02-17'}
    const competition = new Competition(raw)
    assert(competition.date instanceof moment)
    assert.deepStrictEqual(
      competition.toJSON(),
      Object.assign({}, raw, {
        dataUrls: [raw.url],
        contests: [],
        date: moment.utc(raw.date).toDate()
      })
    )
  })
})
