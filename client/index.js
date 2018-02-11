require('babel-polyfill')
const choo = require('choo')
const css = require('sheetify')
const views = require('./lib/views')

css('normalize.css')
css('material-design-lite/material.min.css')
css('./styles/main.css')

// init application
const app = choo()

// load stores
app.use(require('./lib/stores/competition'))
if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-devtools')())
}

// define routes
app.route('/', views.competitions)
app.route('/competitions', views.competitions)
app.route('/competition/:id', views.competitionDetails)
app.route('/*', views['404'])

if (!module.parent) {
  app.mount('body')
} else {
  module.exports = app
}
