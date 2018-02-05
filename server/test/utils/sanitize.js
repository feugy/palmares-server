const {describe, it} = exports.lab = require('lab').script()
const assert = require('power-assert')
const {removeAccents} = require('../../lib/utils')

describe('character utilities', () => {
  const fixtures = {
    a: 'àáâãäåæāăą',
    c: 'çćĉċč',
    d: 'ðďđ',
    e: 'èéêëēĕėęě',
    g: 'ĝğġģ',
    h: 'ĥħ',
    i: 'ìíîïĩīĭįı',
    j: 'ĳĵ',
    k: 'ķĸ',
    l: 'ĺļľŀł',
    n: 'ñńņňŉŋ',
    o: 'òóôõöōŏőœ',
    r: 'ŕŗř',
    s: 'śŝşš',
    t: 'ţťŧ',
    u: 'ùúûüũūŭůűų',
    y: 'ýŷ',
    z: 'źżž'
  }
  for (const replacement in fixtures) {
    for (const input of fixtures[replacement]) {
      it(`should replace ${input} with ${replacement}`, () => {
        assert(replacement === removeAccents(input))
      })
    }
  }
})
