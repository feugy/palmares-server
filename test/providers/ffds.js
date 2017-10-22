const Lab = require('lab')
const {Server} = require('hapi')
const {notFound} = require('boom')
const {promisify} = require('util')
const {resolve} = require('path')
const moment = require('moment')
const readFile = promisify(require('fs').readFile)
const assert = require('power-assert')
const iconv = require('iconv-lite')
const FFDSProvider = require('../../lib/providers/ffds')
const Competition = require('../../lib/models/competition')
const lab = exports.lab = Lab.script()
const {describe, it, before, after} = lab

describe('FFDS provider tests', () => {
  const port = 9123
  const charset = 'iso-8859-1'
  const service = new FFDSProvider({
    name: 'FFDS',
    url: `http://127.0.0.1:${port}`,
    list: 'compet-resultats.php',
    details: 'compet-resultats.php?NumManif=%1$s',
    clubs: 'compet-situation.php',
    couples: 'compet-situation.php?club_id=%1s&Recherche_Club=',
    search: 'compet-situation.php?couple_name=%1$s&Recherche_Nom=',
    dateFormat: 'DD/MM/YYYY'
  })
  const club = 'Aix-en-Provence/AUC- DS'
  const couples = [
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
  let server = null

  before(() => {
    // creates a fake server
    server = new Server() // {debug: {request: ['error']}})
    server.connection({port})

    server.route({
      method: 'GET',
      path: '/compet-situation.php',
      handler: ({query: {club_id: club, couple_name: couple}}, reply) => {
        const file = club === '1118'
          ? 'ffds-aix-en-provence-auc-ds.html'
          : club === '391'
            ? 'ffds-abbeville.html'
            : couple && couple.toLowerCase() === 'simon'
              ? 'ffds-search.html'
              : couple && couple.toLowerCase() === 'toto'
                ? 'ffds-search-empty.html'
                : 'ffds-clubs.html'

        reply(
          readFile(resolve('test', 'fixtures', file))
            .then(content => iconv.encode(content, charset))
            .catch(err => notFound(err))
        ).charset(charset)
      }
    })

    server.route({
      method: 'GET',
      path: '/compet-resultats.php',
      handler: ({query: {NumManif, Compet, Archives}}, reply) => {
        if (Archives === undefined && NumManif === undefined) {
          return reply(notFound())
        }
        const file = NumManif === '1313'
          ? Compet === 'Champ-R-A-EDCBA-L'
            ? '1313-Ad-Lat.html'
            : Compet === 'Champ-R-C-EDC-L'
              ? '1313-J2-Lat.html'
              : Compet === 'Champ-R-J-EDCB-L'
                ? '1313-Yo-Lat.html'
                : Compet === 'Champ-R-P-ED-L'
                  ? '1313-J1-Lat.html'
                  : Compet === 'Champ-R-VW-EDCBA-L'
                    ? '1313-Se-Lat.html'
                    : '1313-details.html'
          : NumManif === '1248'
            ? Compet === 'Comp-N-B-E-L'
              ? '1248-E2-E-Lat.html'
              : Compet === 'Comp-N-C-E-L'
                ? '1248-J2-E-Lat.html'
                : Compet === 'Comp-N-C-D-L'
                  ? '1248-J2-D-Lat.html'
                  : Compet === 'Comp-N-C-E-S'
                    ? '1248-J2-E-Std.html'
                    : Compet === 'Comp-N-C-D-S'
                      ? '1248-J2-D-Std.html'
                      : Compet === 'Coms-N-PBMC-F-L'
                        ? '1248-J-F-Lat.html'
                        : Compet === 'Coms-N-PBMC-F-S'
                          ? '1248-J-F-Std.html'
                          : Compet === 'Open-N-PBMC-CDE-L'
                            ? '1248-J-O-Lat.html'
                            : Compet === 'Open-N-PBMC-CDE-S'
                              ? '1248-J-O-Std.html'
                              : '1248-details.html'
            : NumManif === '1423'
              ? Compet
                ? '1423-A-C-Lat.html'
                : '1423-details.html'
              : NumManif === '1424'
                ? Compet
                  ? '1424-A-O-Lat.html'
                  : '1424-details.html'
                : NumManif === '1425'
                  ? Compet
                    ? '1425-A-O-Lat.html'
                    : '1425-details.html'
                  : NumManif === '1426'
                    ? '1426-details.html'
                    : 'ffds-result.html'

        reply(
          readFile(resolve('test', 'fixtures', file))
            .then(content => iconv.encode(content, charset))
            .catch(err => notFound(err))
        ).charset(charset)
      }
    })

    return server.start()
  })

  after(() => server.stop())

  it('should fail to build provider without required options', done => {
    assert.throws(() =>
      new FFDSProvider({
        name: 'FFDS',
        url: `http://127.0.0.1:${port}`,
        list: 'compet-resultats.php',
        dateFormat: 'DD/MM/YYYY'
      })
      , /"clubs" is required/)
    done()
  })

  it('should retrieve competition list', () =>
    service.listResults(2012).then(results => {
      assert(results.length === 27)

      assert(results[25].place === 'Marseille')
      assert(results[25].id === '21f4eb195bc7de2678b1fb8665d79a28')
      assert(results[25].date.isSame('2013-03-23'))

      assert(results[21].place === 'Illzach')
      assert(results[21].id === '45ca729adf5a8b963b73bbd6197d3a32')
      assert(results[21].date.isSame('2013-02-17'))

      assert(results[18].place === 'Vénissieux')
      assert(results[18].id === 'a486d8b5adb8513ea86df8678ff6b225')
      assert(results[18].date.isSame('2013-02-09'))

      assert(results[0].place === 'Rouen')
      assert(results[0].id === '5c7841d62a598afa46e9e931d0112733')
      assert(results[0].date.isSame('2012-10-06'))
    })
  )

  it('should handle error when fetching competition list', () =>
    service.listResults(new Date().getFullYear())
      .then(res => {
        throw new Error(`Unexpected results ${JSON.stringify(res)}`)
      }, err => {
        assert(err instanceof Error)
        assert(err.message.includes('failed to fetch results from FFDS'))
        assert(err.output.statusCode === 404)
      })
  )

  it('should multiple competition on same day and same place be merged', () =>
    service.listResults(2012).then(results => {
      assert(results.length === 27)
      const competition = results[26]

      assert(competition.place === 'Lillebonne')
      assert(competition.id === '1e42c28c5d99ad5f86d4ae2cfc74c848')
      assert(competition.date.isSame('2013-08-13'))
      assert.deepStrictEqual(competition.dataUrls, [
        `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1423`,
        `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1424`
      ])
      return service.getDetails(competition)
    }).then(competition => {
      assert(competition.contests.length === 54)
      assert.deepStrictEqual(competition.contests[0], {
        title: 'Adultes C Latines',
        results: {
          'Dung Vo - Sonja Dragutinovic': 1,
          'Valentin Edde - Faustine Aydar': 2
        }
      })
      assert.deepStrictEqual(competition.contests[53], {
        title: 'Championnat Régional Adultes A B C D E Latines',
        results: {
          'David Merenguer Torres - Juline Carrel': 1,
          'Theophile Sanson - Lorraine Prevel': 2,
          'Guillaume Lancien - Ludivine Sanson': 3,
          'Valentin Edde - Faustine Aydar': 4
        }
      })
    })
  )

  it('should handle fetching competition details without results', () =>
    service.getDetails(new Competition({
      id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
      place: 'Lillebonne',
      date: moment('2013-08-13'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1426`
    })).then(competition => {
      assert.deepStrictEqual(competition.contests, [])
    })
  )

  it('should handle error when fetching competition details', () =>
    service.getDetails(new Competition({
      id: '1e42c28c5d99ad5f86d4ae2cfc74c848',
      place: 'Lillebonne',
      date: moment('2013-08-13'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1425`
    }))
      .then(res => {
        throw new Error(`Unexpected results ${JSON.stringify(res)}`)
      }, err => {
        assert(err instanceof Error)
        assert(err.message.includes('failed to parse ranking'))
      })
  )

  it('should fetch simple competition contest list', () =>
    service.getDetails(new Competition({
      id: '45ca729adf5a8b963b73bbd6197d3a32',
      place: 'Illzach',
      date: moment('2013-02-17'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1313`
    })).then(competition => {
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
  )

  it('should fetch complex competition contest list', () =>
    service.getDetails(new Competition({
      id: '21f4eb195bc7de2678b1fb8665d79a28',
      place: 'Marseille',
      date: moment('2013-03-23'),
      url: `http://127.0.0.1:${port}/compet-resultats.php?NumManif=1248`
    })).then(competition => {
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
  )

  it('should search all couples of a club', () =>
    service.getGroupCouples(club).then(results => {
      assert.deepStrictEqual(results, couples)
    })
  )

  it('should cache result when searching club couples', () =>
    service.getGroupCouples(club).then(results => {
      assert.deepStrictEqual(results, couples)
      return service.getGroupCouples(club)
    }).then(results => {
      assert.deepStrictEqual(results, couples)
    })
  )

  it('should groups be searched', () =>
    service.searchGroups('VilleurbannE').then(results => {
      assert.deepStrictEqual(results, [
        'Villeurbanne/CVDS',
        'Villeurbanne/RASDS',
        'Villeurbanne/TDC',
        'Villeurbanne/TS'
      ])
    })
  )

  it('should search groups return empty results', () =>
    service.searchGroups('Toto').then(results => {
      assert(results.length === 0)
    })
  )

  it('should search known couples return results', () =>
    service.searchCouples('SimOn').then(results => {
      assert.deepStrictEqual(results, [
        'Jean Marc Brunel - Noella Simon',
        'Damien Feugas - Laeticia Simonin Feugas',
        'Gilles Picard - Cecile Simon-Juarez',
        'Florent Simon - Justine Ernult'
      ])
    })
  )

  it('should search unknown couples return results', () =>
    service.searchCouples('toto').then(results => {
      assert(results.length === 0)
    })
  )

  it('should failed to search group without parameter', () =>
    service.getGroupCouples().then(results => {
      throw new Error(`Unexpected results ${JSON.stringify(results)}`)
    }, err => {
      assert(err instanceof Error)
      assert(err.message.includes('"group parameter" is required'))
    })
  )

  it('should failed search group couples of on unkwnown club', () =>
    service.getGroupCouples('AUC-DS').then(results => {
      throw new Error(`Unexpected results ${JSON.stringify(results)}`)
    }, err => {
      assert(err instanceof Error)
      assert(err.message.includes('no group found'))
    })
  )

  it('should search group couples of empty club', () =>
    service.getGroupCouples('Abbeville/sca').then(results => {
      assert(results.length === 0)
    })
  )
})
