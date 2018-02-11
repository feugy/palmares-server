const {describe, it, beforeEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
require('browser-env')()
const choo = require('choo')
const view = require('../../lib/views/404')

describe('404 view', () => {
  let state
  let emitter
  let emit

  beforeEach(() => {
    const app = choo()
    state = app.state
    emitter = app.emitter
    emit = app.emitter.emit.bind(app.emitter)
  })

  it('should display error message and set title', () =>
    new Promise(resolve => {
      emitter.on(state.events.DOMTITLECHANGE, title => {
        assert(title.includes('introuvable'))
        resolve()
      })

      const html = view(state, emit)

      assert(html.querySelector('h1').textContent === 'Page non trouvée !')
    })
  )
})
