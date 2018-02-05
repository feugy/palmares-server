const {Server} = require('hapi')
const {notFound} = require('boom')
const {resolve} = require('path')
const {promisify} = require('util')
const pino = require('pino')
const readFile = promisify(require('fs').readFile)
const iconv = require('iconv-lite')
const MongoStorage = require('../lib/storages/mongodb')
const FFDSProvider = require('../lib/providers/ffds')
const WDSFProvider = require('../lib/providers/wdsf')

// read env variables
require('dotenv').config()
const isDebug = false

const fixtures = resolve(__dirname, 'fixtures')

/**
 * Builds a test logger
 * @returns {Object} Bunyan compatible logger
 */
exports.getLogger = () => pino({prettyPrint: true, level: isDebug ? 'trace' : 'silent'})

// mongo storage singleton, one per test run
let storage

/**
 * Creates a Storage for MongoDB, base on MONGO_URL env variable
 * Use a collection suffix to make them unic during test
 *
 * @returns {Storage} built storage for MongoDB
 * @throws {Error} if MONGO_URL environment variable isn't set
 */
exports.getMongoStorage = () => {
  if (!('MONGO_URL' in process.env)) {
    throw new Error('Please set MONGO_URL as environment variable')
  }
  if (!storage) {
    storage = new MongoStorage({
      url: process.env.MONGO_URL,
      logger: exports.getLogger(),
      suffix: `_${Math.floor(Math.random() * 100000)}`
    })
  }
  return storage
}

/**
 * Creates a Provider for FFDS server
 * @param {Number} port - port on which server is listening
 * @returns {Provider} built storage for FFDS
 */
exports.getFFDSProvider = port =>
  new FFDSProvider({
    name: 'FFDS',
    logger: exports.getLogger(),
    url: `http://127.0.0.1:${port}`,
    list: 'compet-resultats.php',
    details: 'compet-resultats.php?NumManif=%1$s',
    clubs: 'compet-situation.php',
    couples: 'compet-situation.php?club_id=%1s&Recherche_Club=',
    search: 'compet-situation.php?couple_name=%1$s&Recherche_Nom=',
    dateFormat: 'DD/MM/YYYY'
  })

/**
 * Creates a Provider for WDSF server
 * @param {Number} port - port on which server is listening
 * @returns {Provider} built storage for WDSF
 */
exports.getWDSFProvider = port =>
  new WDSFProvider({
    name: 'WDSF',
    logger: exports.getLogger(),
    url: `http://127.0.0.1:${port}`,
    list: 'Calendar/Competition/Results?format=csv&downloadFromDate=01/01/%1$s&downloadToDate=31/12/%1$s&kindFilter=Competition',
    dateFormat: 'YYYY/MM/DD'
  })

/**
 * @async
 * Creates an http server to mock WDSF server
 * Allows to store, for each incoming request, query and path parameters
 * @param {Number} port - listening port
 * @param {Array<String>} [queryParams = []] - array in which query parameters are stored
 * @param {Array<String>} [pathParams = []] - array in which path parameters are stored
 * @returns {Server} hapi server
 */
exports.startWDSFServer = async (port, queryParams = [], pathParams = []) => {
  // creates a fake server
  const server = new Server({
    port,
    debug: isDebug ? {request: ['error']} : false
  })

  server.route({
    method: 'GET',
    path: '/Calendar/Competition/Results',
    handler: async ({query}) => {
      queryParams.push(JSON.parse(JSON.stringify(query)))
      const year = query.downloadFromDate.replace('01/01/', '')
      try {
        const content = await readFile(resolve(fixtures, `wdsf-result-${year}.csv`))
        return content.toString().replace(/http:\/\/www.worlddancesport.org\/Event/g, `http://localhost:${port}/Event`)
      } catch (err) {
        throw notFound(err)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/Event/Competition/{competition}/{contest}/Ranking',
    handler: async ({query, params: {competition, contest}}) => {
      queryParams.push(JSON.parse(JSON.stringify(query)))
      pathParams.push({competition, contest})
      const file = competition.includes('18979') || competition.includes('18978')
        ? contest.includes('43974') || contest.includes('43971')
          ? '18979-Yo-Std.html'
          : contest.includes('44643')
            ? '18979-J2-Std.html'
            : contest.includes('43976')
              ? '18979-S1-Std.html'
              : contest.includes('43978')
                ? '18979-S2-Std.html'
                : contest.includes('44642')
                  ? '18979-S3-Std.html'
                  : contest.includes('43973') || contest.includes('43972')
                    ? '18979-Yo-Lat.html'
                    : contest.includes('44644')
                      ? '18979-J2-Lat.html'
                      : contest.includes('43975')
                        ? '18979-S1-Lat.html'
                        : contest.includes('43977')
                          ? '18979-S2-Lat.html'
                          : `unknown ${competition}/${contest}`
        : competition.includes('18507')
          ? contest.includes('42617')
            ? '5255-Ch-Std.html'
            : `unknown ${competition}/${contest}`
          : competition.includes('19282')
            ? contest.includes('44881')
              ? '5255-Ad-Lat.html'
              : contest.includes('44882')
                ? '5255-Ad-Std.html'
                : `unknown ${competition}/${contest}`
            : competition.includes('19283')
              ? contest.includes('44883')
                ? '5255-Yo-Lat.html'
                : contest.includes('44884')
                  ? '5255-Yo-Std.html'
                  : `unknown ${competition}/${contest}`
              : competition.includes('19149') && contest.includes('44511')
                ? '19149-Ad-Lat.html'
                : competition.includes('21478') && contest.includes('51883')
                  ? '21478-J2-Std.html'
                  : `unknown ${competition}/${contest}`

      try {
        return await readFile(resolve(fixtures, file))
      } catch (err) {
        throw notFound(err)
      }
    }
  })

  await server.start()
  return server
}

/**
 * @async
 * Creates an http server to mock FFDS server
 * @param {Number} port - listening port
 * @returns {Server} hapi server
 */
exports.startFFDSServer = async port => {
  const charset = 'iso-8859-1'

  // creates a fake server
  const server = new Server({
    port,
    debug: isDebug ? {request: ['error']} : false
  })

  server.route({
    method: 'GET',
    path: '/compet-situation.php',
    handler: async ({query: {club_id: club, couple_name: couple}}, h) => {
      const file = club === '1118'
        ? 'ffds-aix-en-provence-auc-ds.html'
        : club === '391'
          ? 'ffds-abbeville.html'
          : couple && couple.toLowerCase() === 'simon'
            ? 'ffds-search.html'
            : couple && couple.toLowerCase() === 'toto'
              ? 'ffds-search-empty.html'
              : 'ffds-clubs.html'
      try {
        const content = await readFile(resolve(fixtures, file))
        const response = h.response(iconv.encode(content, charset))
        response.charset(charset)
        return response
      } catch (err) {
        throw notFound(err)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/compet-resultats.php',
    handler: async ({query: {NumManif, Compet, Archives}}, h) => {
      if (Archives === undefined && NumManif === undefined) {
        throw notFound()
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
      try {
        const content = await readFile(resolve(fixtures, file))
        const response = h.response(iconv.encode(content, charset))
        response.charset(charset)
        return response
      } catch (err) {
        throw notFound(err)
      }
    }
  })

  await server.start()
  return server
}
