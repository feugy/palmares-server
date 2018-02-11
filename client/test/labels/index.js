const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const {i18n} = require('../../lib/labels')

describe('labels utilities', () => {
  it('should return existing key', () => {
    const str = i18n('buttons.backToMain')
    assert(str === 'Retour à l\'accueil')
  })

  it('should return default message for unknown key', () => {
    const path = 'buttons.unknown'
    assert(i18n(path) === `ERR: path '${path}' not found`)
  })

  it('should perform variable substitution', () => {
    const place = 'this is a test'
    const str = i18n('pageTitles.competitionDetails', {place})
    assert(str === `Palmarès - ${place}`)
  })

  it('should not fail on missing variable', () => {
    const str = i18n('pageTitles.competitionDetails', {})
    assert(str === `ERR: 'Palmarès - \${place}', place is not defined`)
  })
})
