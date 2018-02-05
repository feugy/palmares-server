const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
require('browser-env')()
const Competition = require('../../../server/lib/models/competition')
const component = require('../../lib/components/competition-list')

describe('competition-list component', () => {
  it('should render empty list', () => {
    const html = component()

    assert(html.tagName === 'SPAN')
    assert(html.textContent.includes('Aucune compétition'))
  })

  it('should render competition list', () => {
    const html = component([
      new Competition({id: '1', place: 'Paris', date: '2017-10-27'}),
      new Competition({id: '2', place: 'Lyon', date: '2017-10-05'})
    ])

    assert(html.tagName === 'UL')
    assert(html.querySelectorAll('li').length === 2)
    assert(html.textContent.includes('Paris'))
    assert(html.textContent.includes('Lyon'))
  })
})
