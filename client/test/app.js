const test = require('ava').default
const app = require('../')

test('render main view', async t => {
  const html = app.toString('/', {})
  t.true(html.includes('Choo'))
})

test('render show number of hits', async t => {
  const html = app.toString('/', {totalClicks: 5})
  t.true(html.includes('Current number of clicks: 5'))
})

test('render show number of hits', async t => {
  const html = app.toString('/', {totalClicks: 5})
  t.true(html.includes('Current number of clicks: 5'))
})
