const test = require('ava').default
const moment = require('moment-timezone')
const FFDSProvider = require('../../lib/providers/ffds')
const Competition = require('../../lib/models/competition')
const {startFFDSServer, getFFDSProvider, getLogger} = require('../_test-utils')

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

test.before('given a running server', async () => {
  server = await startFFDSServer(port)
})

test.after.always('stop server', async () => server.stop())

test('should fail to build provider without required options', t =>
  t.throws(() =>
    new FFDSProvider({
      name: 'FFDS',
      logger: getLogger(),
      url: `http://127.0.0.1:${port}`,
      list: 'compet-resultats.php',
      dateFormat: 'DD/MM/YYYY'
    })
    , /"clubs" is required/)
)

test('should retrieve competition list', async t => {
  const results = await service.listResults(2012)
  t.is(results.length, 27)

  t.is(results[25].place, 'Marseille')
  t.is(results[25].id, '21f4eb195bc7de2678b1fb8665d79a28')
  t.true(results[25].date.isSame(moment.tz('2013-03-23', tz)))

  t.is(results[21].place, 'Illzach')
  t.is(results[21].id, '45ca729adf5a8b963b73bbd6197d3a32')
  t.true(results[21].date.isSame(moment.tz('2013-02-17', tz)))

  t.is(results[18].place, 'Vénissieux')
  t.is(results[18].id, 'a486d8b5adb8513ea86df8678ff6b225')
  t.true(results[18].date.isSame(moment.tz('2013-02-09', tz)))

  t.is(results[0].place, 'Rouen')
  t.is(results[0].id, '5c7841d62a598afa46e9e931d0112733')
  t.true(results[0].date.isSame(moment.tz('2012-10-06', tz)))
})

test('should handle error when fetching competition list', async t => {
  const err = await t.throws(service.listResults(new Date().getFullYear()), Error)
  t.true(err.message.includes('failed to fetch results from FFDS'))
  t.is(err.output.statusCode, 404)
})

test('should multiple competition on same day and same place be merged', async t => {
  const results = await service.listResults(2012)
  t.is(results.length, 27)
  const competition = results[26]

  t.is(competition.place, 'Lillebonne')
  t.is(competition.id, '1e42c28c5d99ad5f86d4ae2cfc74c848')
  t.true(competition.date.isSame(moment.tz('2013-08-13', tz)))
  t.deepEqual(competition.dataUrls, [
    `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1423`,
    `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1424`
  ])
  const detailedCompetition = await service.getDetails(competition)
  t.is(detailedCompetition.contests.length, 54)
  t.deepEqual(detailedCompetition.contests[0], {
    title: 'Adultes C Latines',
    results: {
      'Dung Vo - Sonja Dragutinovic': 1,
      'Valentin Edde - Faustine Aydar': 2
    }
  })
  t.deepEqual(detailedCompetition.contests[53], {
    title: 'Championnat Régional Adultes A B C D E Latines',
    results: {
      'David Merenguer Torres - Juline Carrel': 1,
      'Theophile Sanson - Lorraine Prevel': 2,
      'Guillaume Lancien - Ludivine Sanson': 3,
      'Valentin Edde - Faustine Aydar': 4
    }
  })
})

test('should handle fetching competition details without results', async t => {
  const competition = await service.getDetails(new Competition({
    id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
    place: 'Lillebonne',
    date: moment('2013-08-13'),
    url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1426`
  }))
  t.deepEqual(competition.contests, [])
})

test('should handle error when fetching competition details', async t => {
  const err = await t.throws(service.getDetails(new Competition({
    id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
    place: 'Lillebonne',
    date: moment('2013-08-13'),
    url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1425`
  })), Error)
  t.true(err.message.includes('failed to parse ranking'))
})

test('should fetch simple competition contest list', async t => {
  const competition = await service.getDetails(new Competition({
    id: '45ca729adf5a8b963b73bbd6197d3a32',
    place: 'Illzach',
    date: moment('2013-02-17'),
    url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1313`
  }))
  t.is(competition.contests.length, 5)
  const contest = competition.contests
    .find(contest => contest.title === 'Championnat Régional Séniors II Séniors III E D C B A Latines')
  t.false(contest === undefined)
  t.deepEqual(contest.results, {
    'Antoine Mauceri - Pascale Mauceri': 1,
    'Serge Le Poittevin - Christine Schmitt': 2,
    'Daniel Scaravella - Isabelle Scaravella': 3,
    'Marc Blanchard - Chantal Blanchard': 4,
    'Patrick Schwarzentruber - Elisabeth Schwarzentruber': 5
  })
})

test('should fetch complex competition contest list', async t => {
  const competition = await service.getDetails(new Competition({
    id: '21f4eb195bc7de2678b1fb8665d79a28',
    place: 'Marseille',
    date: moment('2013-03-23'),
    url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1248`
  }))
  t.is(competition.contests.length, 9)
  let contest = competition.contests.find(contest => contest.title === 'Juvéniles II E Latines')
  t.false(contest === undefined)
  t.deepEqual(contest.results, {
    'Danny Huck - Louise Jamm': 1,
    'Leon Amiel - Lea Blanchon': 2,
    'Theo Noguera - Eva Gulemirian': 3,
    'Alan Sappa - Louane Piazza': 4
  })
  contest = competition.contests
    .find(contest => contest.title === 'Open Juvéniles I Juvéniles II Juniors I Juniors II C D E Latines')
  t.false(contest === undefined)
  t.deepEqual(contest.results, {
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

test('should search all couples of a club', async t => {
  const results = await service.getGroupCouples(club)
  t.deepEqual(results, expectedCouples)
})

test('should cache result when searching club couples', async t => {
  let couples = await service.getGroupCouples(club)
  t.deepEqual(couples, expectedCouples)
  couples = await service.getGroupCouples(club)
  t.deepEqual(couples, expectedCouples)
})

test('should cache result when searching clubs', async t => {
  let clubs = await service.searchGroups('VilleurbannE')
  t.deepEqual(clubs, expectedClubs)
  clubs = await service.searchGroups('Villeurba')
  t.deepEqual(clubs, expectedClubs)
})

test('should groups be searched', async t => {
  const results = await service.searchGroups('VilleurbannE')
  t.deepEqual(results, expectedClubs)
})

test('should search groups return empty results', async t => {
  const results = await service.searchGroups('Toto')
  t.is(results.length, 0)
})

test('should search known couples return results', async t => {
  const results = await service.searchCouples('SimOn')
  t.deepEqual(results, [
    'Jean Marc Brunel - Noella Simon',
    'Damien Feugas - Laeticia Simonin Feugas',
    'Gilles Picard - Cecile Simon-Juarez',
    'Florent Simon - Justine Ernult'
  ])
})

test('should search unknown couples return results', async t => {
  const results = await service.searchCouples('toto')
  t.is(results.length, 0)
})

test('should failed to search group without parameter', async t => {
  const err = await t.throws(service.getGroupCouples(), Error)
  t.true(err.message.includes('"group parameter" is required'))
})

test('should failed search group couples of on unkwnown club', async t => {
  const err = await t.throws(service.getGroupCouples('AUC-DS'), Error)
  t.true(err.message.includes('no group found'))
})

test('should search group couples of empty club', async t => {
  const results = await service.getGroupCouples('Abbeville/sca')
  t.is(results.length, 0)
})
