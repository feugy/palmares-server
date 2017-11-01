
const request = require('request-promise-native')
const moment = require('moment-timezone')
const cheerio = require('cheerio')
const Joi = require('joi')
const md5 = require('md5')
const {
  filter,
  flatten,
  flow,
  map,
  uniq
} = require('lodash/fp')
const {slugify, stripTags, titleize} = require('underscore.string.fp')
const {sprintf} = require('sprintf-js')
const Competition = require('../models/competition')
const Provider = require('./provider')
const {
  handleRequestError,
  mergeCompetitions,
  removeAccents,
  replaceUnallowed,
  runSerially
} = require('../utils')

const optsSchema = Joi.object({
  clubs: Joi.string().required(),
  couples: Joi.string().required(),
  details: Joi.string().required(),
  search: Joi.string().required()
}).required().unknown().label('opts')

/**
 * Make names to begin with first name, without accentuated letters and capitalized.
 *
 * @param {String} names - contains html text with dancers names, separated by a <br> tag
 * @return {String} the correctly formated name string
 */
const cleanNames = names => {
  if (/couple inconnu/.test(names.toLowerCase())) {
    return 'couple inconnu'
  }
  // split both dancers
  const results = names.split('<br>').map(raw => {
    // remove remaining html
    const dancer = stripTags(raw)
    // extract first name (always in upper cas)
    let last = ''
    let first = ''
    let prevUpper = false
    Array.from(dancer).forEach((char, i) => {
      const code = dancer.charCodeAt(i)
      if ((code >= 65 && code <= 90) || (code >= 192 && code <= 221)) {
        // Uppercase symbol
        // A: 65 Z: 90 À: 192 Ý: 221
        last += char
        prevUpper = true
      } else if ([32, 39, 45].includes(code)) {
        // Separation symbol
        // ': 39 -: 45 ' ':32
        if (prevUpper) {
          last += char
        } else {
          first += char
        }
        prevUpper = false
      } else {
        // Lowercase symbol
        if (prevUpper) {
          last = last.slice(0, last.length - 1)
          first += dancer.slice(i - 1, i + 1)
          prevUpper = false
        } else {
          first += char
        }
      }
    })
    // capitalize and remove accentuated letters
    return `${removeAccents(first, true)} ${removeAccents(last, true)}`
  })
  return `${titleize(results[0])} - ${titleize(results[1])}`
}

/**
 * Remove useless information from contest titles
 *
 * @param {String} original - original contest title
 * @returns {String} its cleanned version
 */
const cleanContest = original =>
  original.replace('Compétition à points', '').replace('Compétition sans points', '').trim()

/**
 * Check if a date is first half of the year (before august 14th, included)
 *
 * @param {Moment} date - checked date
 * @returns {Boolean} true if this date is before august 14th, included, false otherwise
 */
const isFirstHalf = date =>
  date.month() < 7 || (date.month() === 7 && date.date() <= 14)

/**
 * Check if a given year match current season, or is archive
 *
 * @param {year} Number - current season year, always smaller (one from september)
 * @param {Moment} date - checked date
 * @returns {Boolean} true if date is current year and in second half, or if date is next year and first half
 */
const isWithinSeason = (year, date) =>
  (year === date.year() && !isFirstHalf(date)) || (year + 1 === date.year() && isFirstHalf(date))

/**
 * Extract couple names from a club or search result Html response
 *
 * @param {String} body - the Html response
 * @returns {Array<String>} resolve with list of strings containing the couple names (may be empty).
 */
const extractNames = body => {
  const $ = cheerio.load(replaceUnallowed(body.toString()), {decodeEntities: false})
  return Array.from($('#tosort tbody tr')).map(couple => {
    try {
      return cleanNames($(couple).find('td:first-child').text().trim().replace(' / ', '<br>'))
    } catch (exc) {
      throw new Error(`failed to parse couple names '${couple}': ${exc}`)
    }
  })
}

/**
 * Extract a competition header (place, date, url) from incoming Html
 * Ignore competitions whose date is not in current season
 * If multiple competitions are found at the same date and place, enrich existing competition to ensure uniquness
 *
 * @param {Object} line - cheerio object of incoming Html
 * @param {Object} opts - options used to configure extraction:
 * @param {String} opts.url - provider root url
 * @param {String} opts.details - provider details url, appended to root url
 * @param {String} opts.dateFormat - moment.js format used to parse incoming date
 * @param {String} opts.name - provider name
 * @returns {Competition} extracted competition, may be undefined
 */
const extractHeader = (line, opts, year) => {
  // extract id to consult details
  const href = line.find('td:last-child a').attr('href')
  if (!href) {
    return
  }
  const id = href.match(/NumManif=(\d+)$/)
  if (!id) {
    return
  }
  const data = {
    place: titleize(line.find('td').eq(0).text().trim().toLowerCase()),
    date: moment.tz(line.find('td').eq(1).text(), opts.dateFormat, 'Europe/Paris'),
    url: sprintf(`${opts.url}/${opts.details}`, id[1]),
    provider: opts.name
  }
  // only keep competition in current year after mid august, or next year before mid august
  if (!isWithinSeason(year, data.date)) {
    return
  }
  // removes parenthesis information if present
  data.place = data.place.replace(/\(\s*\w+\s*\)/, '').trim()
  // id is date append to place lowercased without non-word characters.
  data.id = md5(`${slugify(data.place)}${data.date.format('YYYYMMDD')}`)
  // search for existing competition with same url
  return new Competition(data)
}

/**
 * @async
 * Extract a competition's contest ranking from contest's id.
 * The competition's contests attribute will be added extracted ranking
 *
 * @param {String} url - full url of the contest ranking
 * @param {Number} rank - rank of this contest in the overall contest list
 * @param {Object} logger - logger used
 * @param {Object} ctx - log context, including:
 * @param {Object} ctx.getDetails - operation context details
 * @param {String} ctx.getDetails.provider - current provider name
 * @param {Competition} ctx.getDetails.competition - competition fetched currently
 * @returns {Object} extracted ranking; object with title and results
 */
const extractRanking = async (url, rank, logger, ctx) => {
  const {getDetails: {provider, competition: {place}, urls}} = ctx
  try {
    const bodyRaw = await request({
      // to avoid encoding problems
      encoding: 'binary',
      url
    })
    // remove errored divs
    const body = replaceUnallowed(bodyRaw.toString())
      .replace(/<\/div><\/th>/g, '</th>')
    // extract ranking
    const $ = cheerio.load(body, {decodeEntities: false})
    const results = {}
    const title = cleanContest($('h3').text())
    // WARNING! cheerio's each has different parameter from forEach
    // first heat is final
    $('.portlet').each((i, heat) =>
      $(heat).find('tbody > tr').each((j, row) => {
        try {
          const names = cleanNames($(row).find('td:nth-child(3)').html())
          if (!(names in results)) {
            results[names] = parseInt($(row).find('td:nth-child(1)').text())
          }
        } catch (exc) {
          throw new Error(`failed to parse ranking '${title}' heat ${i * 2}: ${exc}`)
        }
      })
    )
    logger.debug(ctx, `got contest results (${rank}/${urls.length})`)
    return {title, results}
  } catch (err) {
    handleRequestError(
      `failed to fetch contest ranking from ${provider} ${place}`,
      err,
      logger,
      ctx
    )
  }
}

/**
 * Extract national competitions from the Ballroom Dancing National Federation
 */
module.exports = class FFDSProvider extends Provider {
  /**
   * @constructor
   * Provider constructor: initialize with configuration
   * For mandatory options, @see Provider.constructor
   *
   * @param {Object} opts - provider configuration. Must contains:
   * @param {String} opts.clubs - url to list exsting clubs
   * @param {String} opts.couples - url to list couples of a given club
   * @param {String} opts.details - url to get competition details
   * @param {String} opts.search - url to search for couples
   */
  constructor (opts) {
    super(opts)
    // Group list, to avoid asking too many time them
    this.groups = null

    // Provider configuration options. @see constructor
    const {error} = Joi.validate(opts, optsSchema)
    if (error) {
      throw error
    }
  }

  /** @inheritdoc */
  async listResults (year) {
    const url = `${this.opts.url}/${this.opts.list}${isWithinSeason(year, moment().tz('Europe/Paris')) ? '' : '?Archives'}`
    const ctx = {listResults: {year, url, provider: this.opts.name}}
    this.opts.logger.debug(ctx, 'list competitions')
    try {
      // performs itself the request
      const body = await request({
        // to avoid encoding problems
        encoding: 'binary',
        url
      })
      // extract competiton headers for each lines
      const $ = cheerio.load(replaceUnallowed(body.toString()), {decodeEntities: false})
      return mergeCompetitions(
        Array.from($('table#tosort > tbody > tr'))
          .map(line => extractHeader($(line), this.opts, year))
      )
    } catch (err) {
      handleRequestError(
        `failed to fetch results from ${this.opts.name}`,
        err,
        this.opts.logger,
        ctx
      )
    }
  }

  /** @inheritdoc */
  async getDetails (competition) {
    const ctx = {getDetails: {competition, provider: this.opts.name}}
    this.opts.logger.debug(ctx, 'get competition details')
    // request contests list, for each known urls
    const rawUrls = await runSerially(competition.dataUrls.map(url => async () => {
      try {
        const body = await request({
          // to avoid encoding problems
          encoding: 'binary',
          url
        })
        // extract contests ranking ids
        const $ = cheerio.load(replaceUnallowed(body.toString()), {decodeEntities: false})
        return Array.from($('td > a')).map(link => `${this.opts.url}/${$(link).attr('href')}`)
      } catch (err) {
        handleRequestError(
          `failed to fetch contests from ${this.opts.name} ${competition.place}`,
          err,
          this.opts.logger,
          ctx
        )
      }
    }))

    const urls = flow(flatten, uniq)(rawUrls)
    competition.contests = []
    // no contests yet
    if (!urls.length) {
      return competition
    }
    ctx.getDetails.urls = urls
    this.opts.logger.debug(ctx, `get ${urls.length} contest(s) from urls`)

    // get all contests rankings
    competition.contests = await runSerially(urls.map((url, i) => () =>
      extractRanking(url, i + 1, this.opts.logger, ctx)
    ))
    return competition
  }

  /** @inheritdoc */
  async searchGroups (searched = '') {
    const searchedStr = searched.trim().toLowerCase()
    const ctx = {searchGroups: {searched, provider: this.opts.name}}
    this.opts.logger.debug(ctx, 'search for groups')

    // get group ids and names first
    if (!this.groups) {
      try {
        const body = await request({
          // to avoid encoding problems
          encoding: 'binary',
          url: `${this.opts.url}/${this.opts.clubs}`
        })

        // extract group ids and names and store it in memory
        const $ = cheerio.load(replaceUnallowed(body.toString()), {decodeEntities: false})
        this.groups = Array.from($('[name=club_id] option'))
          .map(group => ({id: $(group).attr('value'), name: $(group).text().trim()}))
      } catch (err) {
        handleRequestError(
          `failed to fetch group list from ${this.opts.name}`,
          err,
          this.opts.logger,
          ctx
        )
      }
    }

    // then performs search
    return flow(
      filter(group => group.name.toLowerCase().includes(searchedStr)),
      map('name')
    )(this.groups)
  }

  /** @inheritdoc */
  async getGroupCouples (searched) {
    const err = Joi.string().empty().required().label('group parameter').validate(searched).error
    if (err) {
      throw err
    }
    const ctx = {getGroupCouples: {searched, provider: this.opts.name}}
    this.opts.logger.debug(ctx, 'search couples of group')

    // search groups list first, if not cached
    if (!this.groups) {
      await this.searchGroups('')
    }
    // get groups id
    const group = this.groups.find(group => group.name.toLowerCase() === searched.trim().toLowerCase())
    if (!group) {
      throw new Error(`no group found with name ${searched}`)
    }

    try {
      // now get its couples
      const body = await request({
        // to avoid encoding problems
        encoding: 'binary',
        url: sprintf(`${this.opts.url}/${this.opts.couples}`, group.id)
      })
      return extractNames(body)
    } catch (err) {
      handleRequestError(
        `failed to fetch couples of group ${searched} from ${this.opts.name}`,
        err,
        this.opts.logger,
        ctx
      )
    }
  }

  /** @inheritdoc */
  async searchCouples (searched = '') {
    const ctx = {searchCouples: {searched, provider: this.opts.name}}
    this.opts.logger.debug(ctx, 'search for couples')
    try {
      const body = await request({
        // to avoid encoding problems
        encoding: 'binary',
        url: sprintf(`${this.opts.url}/${this.opts.search}`, encodeURIComponent(searched.toUpperCase()))
      })
      return extractNames(body)
    } catch (err) {
      handleRequestError(
        `failed to fetch couples from ${this.opts.name}`,
        err,
        this.opts.logger,
        ctx
      )
    }
  }
}
