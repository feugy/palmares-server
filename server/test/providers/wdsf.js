const {describe, it, before, after, beforeEach} = exports.lab = require('lab').script()
const assert = require('power-assert')
const moment = require('moment')
const Competition = require('../../lib/models/competition')
const {startWDSFServer, getWDSFProvider} = require('../test-utils')

const port = 9123
const service = getWDSFProvider(port)
let server = null
// store query and path parameters (in order of appearance)
const queryParams = []
const pathParams = []

describe('wdsf provider', () => {
  beforeEach(() => {
    queryParams.splice(0, queryParams.length)
    pathParams.splice(0, pathParams.length)
  })

  before(async () => {
    server = await startWDSFServer(port, queryParams, pathParams)
  })

  after(async () => server.stop())

  it('should retrieve competition list', async () => {
    const results = await service.listResults(2012)
    assert.deepStrictEqual(queryParams[0], {
      format: 'csv',
      kindFilter: 'Competition',
      downloadFromDate: '01/01/2012',
      downloadToDate: '31/12/2012'
    })
    assert(results.length === 77)

    // competition with different names on same days and place have been merged
    assert(results[0].place === 'San Lazzaro Di Savena')
    assert(results[0].id === 'b38521030e81c5ddcc7cdeebbe4fe14f')
    assert(results[0].date.isSame(moment.utc('2013-01-04')))

    // competition on several days have been merged
    assert(results[2].place === 'Moscow')
    assert(results[2].id === '7d00c5480c303ae032043495a6cc7d26')
    assert(results[2].date.isSame(moment.utc('2013-01-05')))

    // Kiev World Open, Kiev World Standard and Kiev Open have been merged into one competition
    assert(results[76].place === 'Kiev')
    assert(results[76].id === '4aee29e66d0644c811b8babaf30e3be8')
    assert(results[76].date.isSame(moment.utc('2013-11-24')))
  })

  it('should handle error when fetching competition list', async () => {
    try {
      await service.listResults(2000)
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('failed to fetch results from WDSF'))
      assert(err.output.statusCode === 404)
      return
    }
    throw new Error('should have failed')
  })

  it('should fetch simple competition contest list', async () => {
    const competition = await service.getDetails(new Competition({
      id: '7a217757907283d497436854677adabd',
      place: 'San Lazzaro Di Savena (bologna)',
      date: moment.utc('2013-01-04'),
      dataUrls: [
        `http://127.0.0.1:${port}/Event/Competition/Open-San_Lazzaro_di_Savena_(Bologna)-18979/Junior_II-Standard-44643`,
        `http://127.0.0.1:${port}/Event/Competition/Open-San_Lazzaro_di_Savena_(Bologna)-18979/Junior_II-Latin-44644`
      ]
    }))
    assert(competition.contests.length === 2)
    const contest = competition.contests
      .find(contest => contest.title === 'Junior II Latin Open')
    assert(contest)
    assert.deepStrictEqual(contest.results, {
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

  it('should handle cancelled contests', async () => {
    const competition = await service.getDetails(new Competition({
      id: '',
      place: 'GrandSlam Moscow',
      date: moment('2016-10-28'),
      dataUrls: [`http://127.0.0.1:${port}/Event/Competition/GrandSlam-Moscow-19149/Adult-Latin-44511`]
    }))
    assert(competition.contests.length === 0)
  })

  it('should handle in progress contests', async () => {
    const competition = await service.getDetails(new Competition({
      id: '',
      place: 'Open Moscow',
      date: moment('2017-10-29'),
      dataUrls: [`http://127.0.0.1:${port}/Event/Competition/Open-Moscow-21478/Junior_II-Standard-51883`]
    }))
    assert(competition.contests.length === 0)
  })
})
