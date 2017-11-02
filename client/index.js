const choo = require('choo')

const app = choo()
if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-devtools')())
}

app.use(require('./lib/store'))

app.route('/', require('./lib/views/main'))
app.route('/*', require('./lib/views/404'))

if (!module.parent) {
  app.mount('body')
} else {
  module.exports = app
}
