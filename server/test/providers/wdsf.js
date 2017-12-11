const test = require('ava').default
const moment = require('moment')
const Competition = require('../../lib/models/competition')
const {startWDSFServer, getWDSFProvider} = require('../test-utils')

const port = 9123
const service = getWDSFProvider(port)
let server = null
// store query and path parameters (in order of appearance)
const queryParams = []
const pathParams = []

test.beforeEach(() => {
  queryParams.splice(0, queryParams.length)
  pathParams.splice(0, pathParams.length)
})

test.before('given a running server', async () => {
  server = await startWDSFServer(port, queryParams, pathParams)
})

test.after.always('stop server', async () => server.stop())

test('should retrieve competition list', async t => {
  const results = await service.listResults(2012)
  t.deepEqual(queryParams[0], {
    format: 'csv',
    kindFilter: 'Competition',
    downloadFromDate: '01/01/2012',
    downloadToDate: '31/12/2012'
  })
  t.is(results.length, 77)

  // competition with different names on same days and place have been merged
  t.is(results[0].place, 'San Lazzaro Di Savena')
  t.is(results[0].id, 'b38521030e81c5ddcc7cdeebbe4fe14f')
  t.true(results[0].date.isSame(moment.utc('2013-01-04')))

  // competition on several days have been merged
  t.is(results[2].place, 'Moscow')
  t.is(results[2].id, '7d00c5480c303ae032043495a6cc7d26')
  t.true(results[2].date.isSame(moment.utc('2013-01-05')))

  // Kiev World Open, Kiev World Standard and Kiev Open have been merged into one competition
  t.is(results[76].place, 'Kiev')
  t.is(results[76].id, '4aee29e66d0644c811b8babaf30e3be8')
  t.true(results[76].date.isSame(moment.utc('2013-11-24')))
})

test('should handle error when fetching competition list', async t => {
  const err = await t.throws(service.listResults(2000), Error)
  t.true(err.message.includes('failed to fetch results from WDSF'))
  t.is(err.output.statusCode, 404)
})

test('should fetch simple competition contest list', async t => {
  const competition = await service.getDetails(new Competition({
    id: '7a217757907283d497436854677adabd',
    place: 'San Lazzaro Di Savena (bologna)',
    date: moment.utc('2013-01-04'),
    dataUrls: [
      `http://127.0.0.1:${port}/Event/Competition/Open-San_Lazzaro_di_Savena_(Bologna)-18979/Junior_II-Standard-44643`,
      `http://127.0.0.1:${port}/Event/Competition/Open-San_Lazzaro_di_Savena_(Bologna)-18979/Junior_II-Latin-44644`
    ]
  }))
  t.is(competition.contests.length, 2)
  const contest = competition.contests
    .find(contest => contest.title === 'Junior II Latin Open')
  t.false(contest === undefined)
  t.deepEqual(contest.results, {
    'Leonardo Lini - Mia Gabusi': 1,
    'Samuel Santarelli - Alexandra Leone': 2,
    'Alessio Russo - Antonella Carrieri': 3,
    'Leonardo Marinelli - Aurora Pacetti': 4,
    'Rodolfo Gentilini - Beatrice Fabi': 5,
    'Leonardo Aiuti - Cecilia Bruni': 6,
    'Massimiliano Domenico Proietto - Cinziana Palumbo': 7,
    'Klevis Shera - Cristiana Pasquale': 8,
    'Gilbert Lucas Bugeja - Kelsey Borg': 9,
    'Emanuele Nucciotti - Erika Straccali': 10,
    'Scapinello Giacomo - Martina Pasquale': 11,
    'Silvio Morelli - Alessandra Benvenuto': 12,
    'Monti Daniele - Gaia Cirillo': 13,
    'Daniele Sciretti - Laura Sciretti': 14,
    'Andrea Fornasiere - Elisa Brunetti': 15,
    'Michal Prochazka - Katerina Srostlikova': 16,
    'Nicola Pellegrino - Manuela Venturi': 17,
    'Michel Peloux - Alessandra Bufano': 18,
    'Daniele Sciolino - Giorgia Caldarera': 19,
    'Mirco Boccaletti - Gaia Serpini': 20,
    'Nicholas Fiorini - Elena Lamieri': 21,
    'Domenico Maggi - Beatrice Righi': 22,
    'Mirco Ranieri - Sofia Beltrandi': 22
  })
})

test('should handle cancelled contests', async t => {
  const competition = await service.getDetails(new Competition({
    id: '',
    place: 'GrandSlam Moscow',
    date: moment('2016-10-28'),
    dataUrls: [`http://127.0.0.1:${port}/Event/Competition/GrandSlam-Moscow-19149/Adult-Latin-44511`]
  }))
  t.is(competition.contests.length, 0)
})

test('should handle in progress contests', async t => {
  const competition = await service.getDetails(new Competition({
    id: '',
    place: 'Open Moscow',
    date: moment('2017-10-29'),
    dataUrls: [`http://127.0.0.1:${port}/Event/Competition/Open-Moscow-21478/Junior_II-Standard-51883`]
  }))
  t.is(competition.contests.length, 0)
})
