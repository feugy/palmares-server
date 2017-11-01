const test = require('ava').default
const moment = require('moment')
const Competition = require('../../lib/models/competition')

test('should not build instance without options', t =>
  t.throws(() => new Competition(), /no id provided/)
)

test('should not build instance without ids', t =>
  t.throws(() => new Competition({}), /no id provided/)
)

test('should url take precedence over string dataUrls', t => {
  const competition = new Competition({id: '', url: 'url1', dataUrls: 'url2'})
  t.is(competition.url, 'url1')
  t.deepEqual(competition.dataUrls, ['url1'])
})

test('should url take precedence over empty dataUrls', t => {
  const competition = new Competition({id: '', url: 'url1'})
  t.is(competition.url, 'url1')
  t.deepEqual(competition.dataUrls, ['url1'])
})

test('should url not take precedence over array dataUrls', t => {
  const competition = new Competition({id: '', url: 'url1', dataUrls: ['url2']})
  t.is(competition.url, 'url1')
  t.deepEqual(competition.dataUrls, ['url2'])
})

test('should serialize competitions', t => {
  const raw = {id: 'id', url: 'url1', date: '2017-02-17'}
  const competition = new Competition(raw)
  t.true(competition.date instanceof moment)
  t.deepEqual(
    competition.toJSON(),
    Object.assign({}, raw, {
      dataUrls: [raw.url],
      contests: [],
      date: moment.utc(raw.date).toDate()
    })
  )
})
