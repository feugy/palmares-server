const test = require('ava').default
require('browser-env')()
const Competition = require('../../../server/lib/models/competition')
const component = require('../../lib/components/competition-list')

test('should render empty list', t => {
  const html = component()

  t.is(html.tagName, 'SPAN')
  t.true(html.textContent.includes('Aucune compétition'))
})

test('should render competition list', t => {
  const html = component([
    new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
    new Competition({id: '2', place: 'Lyon', date: '2017-10-05'})
  ])

  t.is(html.tagName, 'UL')
  t.is(html.querySelectorAll('li').length, 2)
  t.true(html.textContent.includes('Paris'))
  t.true(html.textContent.includes('Lyon'))
})
