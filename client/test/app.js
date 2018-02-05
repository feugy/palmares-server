const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
require('browser-env')()
const app = require('../')

describe.skip('main app', () => {
  it('render main view', async t => {
    const html = app.toString('/', {})
    assert(html.includes('Choo'))
  })

  it('render show number of hits', async t => {
    const html = app.toString('/', {totalClicks: 5})
    assert(html.includes('Current number of clicks: 5'))
  })

  it('render show number of hits', async t => {
    const html = app.toString('/', {totalClicks: 5})
    assert(html.includes('Current number of clicks: 5'))
  })
})
