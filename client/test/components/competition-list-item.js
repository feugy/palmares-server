const test = require('ava').default
require('browser-env')()
const Competition = require('../../../server/lib/models/competition')
const component = require('../../lib/components/competition-list-item')

test('should render competition', t => {
  const html = component(new Competition({id: '1', place: 'Paris', date: '2017-10-27'}))

  t.is(html.tagName, 'LI')
  t.is(html.id, '1')
  t.true(html.textContent.includes('Paris'))
})
