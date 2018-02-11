const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
require('browser-env')()
const Competition = require('../../../server/lib/models/competition')
const component = require('../../lib/components/competition-list-item')

describe('competition-list-item component', () => {
  it('should render competition', () => {
    const html = component(new Competition({id: '1', place: 'Paris', date: '2017-10-27'}))

    assert(html.tagName === 'LI')
    assert(html.id === '1')
    assert(html.textContent.includes('Paris'))
  })
})
