const Lab = require('lab')
const {Server} = require('hapi')
const {notFound} = require('boom')
const {promisify} = require('util')
const {resolve} = require('path')
const moment = require('moment')
const readFile = promisify(require('fs').readFile)
const assert = require('power-assert')
const WDSFProvider = require('../../lib/providers/wdsf')
const Competition = require('../../lib/models/competition')
const lab = exports.lab = Lab.script()
const {describe, it, before, after, beforeEach} = lab

describe('WDSF provider tests', () => {
  const port = 9123
  const service = new WDSFProvider({
    name: 'WDSF',
    url: `http://127.0.0.1:${port}`,
    list: 'Calendar/Competition/Results?format=csv&downloadFromDate=01/01/%1$s&downloadToDate=31/12/%1$s&kindFilter=Competition',
    dateFormat: 'YYYY/MM/DD'
  })
  let server = null
  // store query and path parameters (in order of appearance)
  const queryParams = []
  const pathParams = []

  beforeEach(done => {
    queryParams.splice(0, queryParams.length)
    pathParams.splice(0, pathParams.length)
    done()
  })

  before(() => {
    // creates a fake server
    server = new Server() // {debug: {request: ['error']}})
    server.connection({port})

    server.route({
      method: 'GET',
      path: '/Calendar/Competition/Results',
      handler: ({query}, reply) => {
        queryParams.push(JSON.parse(JSON.stringify(query)))
        if (!query.downloadFromDate.includes('2012')) {
          return reply(notFound('no competition for this year'))
        }
        reply(readFile(resolve('test', 'fixtures', 'wdsf-result.csv')))
      }
    })

    server.route({
      method: 'GET',
      path: '/Event/Competition/{competition}',
      handler: ({query, params: {competition}}, reply) => {
        queryParams.push(JSON.parse(JSON.stringify(query)))
        pathParams.push({competition})
        reply(
          readFile(resolve('test', 'fixtures',
            competition.includes('18979')
              ? '18979-details.html'
              : competition.includes('19149')
                ? '19149-details.html'
                : competition.includes('21478')
                  ? '21478-details.html'
                  : competition
          )).catch(err => notFound(err))
        )
      }
    })

    server.route({
      method: 'GET',
      path: '/Event/Competition/{competition}/{contest}/Ranking',
      handler: ({query, params: {competition, contest}}, reply) => {
        queryParams.push(JSON.parse(JSON.stringify(query)))
        pathParams.push({competition, contest})
        const file = competition.includes('18979')
          ? contest.includes('43974')
            ? '18979-Yo-Std.html'
            : contest.includes('44643')
              ? '18979-J2-Std.html'
              : contest.includes('43976')
                ? '18979-S1-Std.html'
                : contest.includes('43978')
                  ? '18979-S2-Std.html'
                  : contest.includes('44642')
                    ? '18979-S3-Std.html'
                    : contest.includes('43973')
                      ? '18979-Yo-Lat.html'
                      : contest.includes('44644')
                        ? '18979-J2-Lat.html'
                        : contest.includes('43975')
                          ? '18979-S1-Lat.html'
                          : contest.includes('43977')
                            ? '18979-S2-Lat.html'
                            : `${competition}/${contest}`
          : competition.includes('18507')
            ? contest.includes('42617')
              ? '5255-Ch-Std.html'
              : `${competition}/${contest}`
            : competition.includes('19282')
              ? contest.includes('44881')
                ? '5255-Ad-Lat.html'
                : contest.includes('44882')
                  ? '5255-Ad-Std.html'
                  : `${competition}/${contest}`
              : competition.includes('19283')
                ? contest.includes('44883')
                  ? '5255-Yo-Lat.html'
                  : contest.includes('44884')
                    ? '5255-Yo-Std.html'
                    : `${competition}/${contest}`
                : competition.includes('19149')
                  ? contest.includes('44511')
                    ? '19149-Ad-Lat.html'
                    : `${competition}/${contest}`
                  : competition.includes('21478')
                    ? contest.includes('51883')
                      ? '21478-J2-Std.html'
                      : `${competition}/${contest}`
                    : `${competition}/${contest}`
        reply(
          readFile(resolve('test', 'fixtures', file))
            .catch(err => notFound(err))
        )
      }
    })

    return server.start()
  })

  after(() => server.stop())

  it('should retrieve competition list', () =>
    service.listResults(2012).then(results => {
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
      assert(results[0].date.isSame('2013-01-04'))

      // competition on several days have been merged
      assert(results[2].place === 'Moscow')
      assert(results[2].id === '7d00c5480c303ae032043495a6cc7d26')
      assert(results[2].date.isSame('2013-01-05'))

      // Kiev World Open, Kiev World Standard and Kiev Open have been merged into one competition
      assert(results[76].place === 'Kiev')
      assert(results[76].id === '4aee29e66d0644c811b8babaf30e3be8')
      assert(results[76].date.isSame('2013-11-24'))
    })
  )

  it('should handle error when fetching competition list', () => {
    const year = new Date().getFullYear()
    return service.listResults(year)
      .then(res => {
        throw new Error(`Unexpected results ${JSON.stringify(res)}`)
      }, err => {
        assert(err instanceof Error)
        assert(err.message.includes('failed to fetch results from WDSF'))
        assert(err.output.statusCode === 404)
      })
  })

  it('should fetch simple competition contest list', () =>
    service.getDetails(new Competition({
      id: '7a217757907283d497436854677adabd',
      place: 'San Lazzaro Di Savena (bologna)',
      date: moment('2013-01-04'),
      url: `http://127.0.0.1:${port}/Event/Competition/Open-San_Lazzaro_di_Savena_(Bologna)-18979`
    })).then(competition => {
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
  )

  it('should handle cancelled contests', () =>
    service.getDetails(new Competition({
      id: '',
      place: 'GrandSlam Moscow',
      date: moment('2016-10-28'),
      url: `http://127.0.0.1:${port}/Event/Competition/GrandSlam-Moscow-19149`
    })).then(competition => {
      assert(competition.contests.length === 0)
    })
  )

  it('should handle in progress contests', () =>
    service.getDetails(new Competition({
      id: '',
      place: 'Open Moscow',
      date: moment('2017-10-29'),
      url: `http://127.0.0.1:${port}/Event/Competition/Open-Moscow-21478`
    })).then(competition => {
      assert(competition.contests.length === 0)
    })
  )
})
