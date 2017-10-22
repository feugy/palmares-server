const Lab = require('lab')
const assert = require('power-assert')
const moment = require('moment')
const Competition = require('../../lib/models/competition')
const lab = exports.lab = Lab.script()
const {describe, it} = lab

describe('Competition class', () => {
  it('should not build instance without ids', done => {
    assert.throws(() => new Competition(), /no id provided/)
    assert.throws(() => new Competition({}), /no id provided/)
    done()
  })

  it('should take competition with and without data urls', done => {
    let competition = new Competition({id: '', url: 'url1', dataUrls: 'url2'})
    assert(competition.url === 'url1')
    assert.deepStrictEqual(competition.dataUrls, ['url1'])

    competition = new Competition({id: '', url: 'url1'})
    assert(competition.url === 'url1')
    assert.deepStrictEqual(competition.dataUrls, ['url1'])

    competition = new Competition({id: '', url: 'url1', dataUrls: ['url2']})
    assert(competition.url === 'url1')
    assert.deepStrictEqual(competition.dataUrls, ['url2'])
    done()
  })

  it('should serialize competitions', done => {
    const raw = {id: 'id', url: 'url1', date: '2017-02-17'}
    const competition = new Competition(raw)
    assert(competition.date instanceof moment)
    assert.deepStrictEqual(competition.toJSON(), Object.assign({}, raw, {
      dataUrls: [raw.url],
      contests: [],
      date: moment.utc(raw.date).toDate()
    }))
    done()
  })
})
