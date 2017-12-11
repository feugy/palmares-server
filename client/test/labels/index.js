const test = require('ava').default
const {i18n} = require('../../lib/labels')

test('should return existing key', t => {
  const str = i18n('buttons.backToMain')
  t.is(str, 'Retour à l\'accueil')
})

test('should return default message for unknown key', t => {
  const path = 'buttons.unknown'
  t.is(i18n(path), `ERR: path '${path}' not found`)
})

test('should perform variable substitution', t => {
  const place = 'this is a test'
  const str = i18n('pageTitles.competitionDetails', {place})
  t.is(str, `Palmarès - ${place}`)
})

test('should not fail on missing variable', t => {
  const str = i18n('pageTitles.competitionDetails', {})
  t.is(str, `ERR: 'Palmarès - \${place}', place is not defined`)
})
