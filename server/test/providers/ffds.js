const {describe, it, before, after} = exports.lab = require('lab').script()
const assert = require('power-assert')
const moment = require('moment-timezone')
const FFDSProvider = require('../../lib/providers/ffds')
const Competition = require('../../lib/models/competition')
const {startFFDSServer, getFFDSProvider, getLogger} = require('../test-utils')

const port = 9124
const club = 'Aix-en-Provence/AUC- DS'
const expectedCouples = [
  'Patrick Duong - Chau Bui Thi Huyen',
  'Alain Fauqueux - Anne-Marie Fauqueux',
  'Jean Claude Fumat - Genevieve Legier',
  'Denis Garcin - Stevie Broc',
  'Frederic Jover - Emilie Verone',
  'Henri Muller - Miroslawa Muller',
  'Roger Nogier - Pascale Nogier',
  'Louis Ortega - Solange Ortega',
  'Alain Roux - Maryse Jenna',
  'Daniel Savarino - Claire Morris',
  'Stephane Vaillant - Audrey Lambinet'
]
const expectedClubs = [
  'Villeurbanne/CVDS',
  'Villeurbanne/RASDS',
  'Villeurbanne/TDC',
  'Villeurbanne/TS'
]
const service = getFFDSProvider(port)
const tz = 'Europe/Paris'
let server = null

describe('ffds provider', () => {
  before(async () => {
    server = await startFFDSServer(port)
  })

  after(async () => server.stop())

  it('should fail to build provider without required options', () => {
    try {
      new FFDSProvider({
        name: 'FFDS',
        logger: getLogger(),
        url: `http://127.0.0.1:${port}`,
        list: 'compet-resultats.php',
        dateFormat: 'DD/MM/YYYY'
      })
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"clubs" is required'))
      return
    }
    throw new Error('should have failed')
  })

  it('should retrieve competition list', async () => {
    const results = await service.listResults(2012)
    assert(results.length === 27)

    assert(results[25].place === 'Marseille')
    assert(results[25].id === '21f4eb195bc7de2678b1fb8665d79a28')
    assert(results[25].date.isSame(moment.tz('2013-03-23', tz)))

    assert(results[21].place === 'Illzach')
    assert(results[21].id === '45ca729adf5a8b963b73bbd6197d3a32')
    assert(results[21].date.isSame(moment.tz('2013-02-17', tz)))

    assert(results[18].place === 'Vénissieux')
    assert(results[18].id === 'a486d8b5adb8513ea86df8678ff6b225')
    assert(results[18].date.isSame(moment.tz('2013-02-09', tz)))

    assert(results[0].place === 'Rouen')
    assert(results[0].id === '5c7841d62a598afa46e9e931d0112733')
    assert(results[0].date.isSame(moment.tz('2012-10-06', tz)))
  })

  it('should handle error when fetching competition list', async () => {
    try {
      // 2017 is expected to fail
      await service.listResults(2017)
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to fetch results from FFDS'))
      assert(err.output.statusCode === 404)
      return
    }
    throw new Error('should have failed')
  })

  it('should multiple competition on same day and same place be merged', async () => {
    const results = await service.listResults(2012)
    assert(results.length === 27)
    const competition = results[26]

    assert(competition.place === 'Lillebonne')
    assert(competition.id === '1e42c28c5d99ad5f86d4ae2cfc74c848')
    assert(competition.date.isSame(moment.tz('2013-08-13', tz)))
    assert.deepStrictEqual(competition.dataUrls, [
      `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1423`,
      `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1424`
    ])
    const detailedCompetition = await service.getDetails(competition)
    assert(detailedCompetition.contests.length === 54)
    assert.deepStrictEqual(detailedCompetition.contests[0], {
      title: 'Adultes C Latines',
      results: {
        'Dung Vo - Sonja Dragutinovic': 1,
        'Valentin Edde - Faustine Aydar': 2
      }
    })
    assert.deepStrictEqual(detailedCompetition.contests[53], {
      title: 'Championnat Régional Adultes A B C D E Latines',
      results: {
        'David Merenguer Torres - Juline Carrel': 1,
        'Theophile Sanson - Lorraine Prevel': 2,
        'Guillaume Lancien - Ludivine Sanson': 3,
        'Valentin Edde - Faustine Aydar': 4
      }
    })
  })

  it('should handle fetching competition details without results', async () => {
    const competition = await service.getDetails(new Competition({
      id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
      place: 'Lillebonne',
      date: moment('2013-08-13'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1426`
    }))
    assert.deepStrictEqual(competition.contests, [])
  })

  it('should handle error when fetching competition details', async () => {
    try {
      await service.getDetails(new Competition({
        id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
        place: 'Lillebonne',
        date: moment('2013-08-13'),
        url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1425`
      }))
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to parse ranking'))
      return
    }
    throw new Error('should have failed')
  })

  it('should fetch simple competition contest list', async () => {
    const competition = await service.getDetails(new Competition({
      id: '45ca729adf5a8b963b73bbd6197d3a32',
      place: 'Illzach',
      date: moment('2013-02-17'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1313`
    }))
    assert(competition.contests.length === 5)
    const contest = competition.contests
      .find(contest => contest.title === 'Championnat Régional Séniors II Séniors III E D C B A Latines')
    assert(contest)
    assert.deepStrictEqual(contest.results, {
      'Antoine Mauceri - Pascale Mauceri': 1,
      'Serge Le Poittevin - Christine Schmitt': 2,
      'Daniel Scaravella - Isabelle Scaravella': 3,
      'Marc Blanchard - Chantal Blanchard': 4,
      'Patrick Schwarzentruber - Elisabeth Schwarzentruber': 5
    })
  })

  it('should fetch complex competition contest list', async () => {
    const competition = await service.getDetails(new Competition({
      id: '21f4eb195bc7de2678b1fb8665d79a28',
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1248`
    }))
    assert(competition.contests.length === 9)
    let contest = competition.contests.find(contest => contest.title === 'Juvéniles II E Latines')
    assert(contest)
    assert.deepStrictEqual(contest.results, {
      'Danny Huck - Louise Jamm': 1,
      'Leon Amiel - Lea Blanchon': 2,
      'Theo Noguera - Eva Gulemirian': 3,
      'Alan Sappa - Louane Piazza': 4
    })
    contest = competition.contests
      .find(contest => contest.title === 'Open Juvéniles I Juvéniles II Juniors I Juniors II C D E Latines')
    assert(contest)
    assert.deepStrictEqual(contest.results, {
      'Nicolas Constancia - Romane Rousselot': 1,
      'Mathias Monier - Pauline Adries': 2,
      'Mael Legrain - Joana Grosset Janin': 3,
      'Baptiste Olivero - Maelys Michelin': 4,
      'Gracia Porzio - Stelantha Porzio': 5,
      'Cameron Frutuoso - Marion Moriana': 6,
      'Thomas Moriana - Carla Frutuoso': 7,
      'Tristan Arnaud - Emma Prats': 8,
      'Melvin Chauliaguet - Alicia Charbit': 9,
      'Alexis Lopez - Anaelle Belmont': 9,
      'Damien Colombet - Laurianne Moullard': 11,
      'Leo Bretagne - Camille Monachino': 12,
      'Danny Huck - Louise Jamm': 13,
      'Leon Amiel - Lea Blanchon': 14,
      'Lucas Gonzalez - Deborah Carpentier': 14,
      'Theo Noguera - Eva Gulemirian': 16,
      'Kilian Bonastre - Maelys Meneveaux': 16,
      'Audric Goursolle - Justine Esperandieu': 18,
      'Arnaud Latrasse - Pauline Latrasse': 19,
      'Alan Sappa - Louane Piazza': 19
    })
  })

  it('should search all couples of a club', async () => {
    const results = await service.getGroupCouples(club)
    assert.deepStrictEqual(results, expectedCouples)
  })

  it('should cache result when searching club couples', async () => {
    let couples = await service.getGroupCouples(club)
    assert.deepStrictEqual(couples, expectedCouples)
    couples = await service.getGroupCouples(club)
    assert.deepStrictEqual(couples, expectedCouples)
  })

  it('should cache result when searching clubs', async () => {
    let clubs = await service.searchGroups('VilleurbannE')
    assert.deepStrictEqual(clubs, expectedClubs)
    clubs = await service.searchGroups('Villeurba')
    assert.deepStrictEqual(clubs, expectedClubs)
  })

  it('should groups be searched', async () => {
    const results = await service.searchGroups('VilleurbannE')
    assert.deepStrictEqual(results, expectedClubs)
  })

  it('should search groups return empty results', async () => {
    const results = await service.searchGroups('Toto')
    assert(results.length === 0)
  })

  it('should search known couples return results', async () => {
    const results = await service.searchCouples('SimOn')
    assert.deepStrictEqual(results, [
      'Jean Marc Brunel - Noella Simon',
      'Damien Feugas - Laeticia Simonin Feugas',
      'Gilles Picard - Cecile Simon-Juarez',
      'Florent Simon - Justine Ernult'
    ])
  })

  it('should search unknown couples return results', async () => {
    const results = await service.searchCouples('toto')
    assert(results.length === 0)
  })

  it('should failed to search group without parameter', async () => {
    try {
      await service.getGroupCouples()
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('"group parameter" is required'))
      return
    }
    throw new Error('should have failed')
  })

  it('should failed search group couples of on unkwnown club', async () => {
    try {
      await service.getGroupCouples('AUC-DS')
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('no group found'))
      return
    }
    throw new Error('should have failed')
  })

  it('should search group couples of empty club', async () => {
    const results = await service.getGroupCouples('Abbeville/sca')
    assert(results.length === 0)
  })
})
