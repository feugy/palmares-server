const {slugify, titleize} = require('underscore.string.fp')
const {sprintf} = require('sprintf-js')
const request = require('request-promise-native')
const moment = require('moment')
const cheerio = require('cheerio')
const md5 = require('md5')
const {promisify} = require('util')
const parse = promisify(require('csv-parse'))
const Competition = require('../models/competition')
const Provider = require('./provider')
const {
  handleRequestError,
  mergeCompetitions,
  removeAccents,
  replaceUnallowed,
  runSerially
} = require('../utils')

/**
 * Extract a competition header (place, date, url) from incoming Html
 * Ignore competitions whose date is not in current season
 * If multiple competitions are found at the same date and place, enrich existing competition to ensure uniquness
 *
 * @param {Object} line - cheerio object of incoming Html
 * @param {Object} opts - options used to configure extraction:
 * @param {String} opts.dateFormat - moment.js format used to parse incoming date (UTC)
 * @param {String} opts.name - provider name
 * @returns {Competition} extracted competition, may be undefined
 */
const extractHeader = (record, opts, year) => {
  const data = {
    // place is city, removes parenthesis information if present
    place: titleize(removeAccents(record.Location).replace(/\(\s*\w+\s*\)/, '').trim()),
    date: moment.utc(record.Date, opts.dateFormat),
    url: record.CompetitionUrl,
    provider: opts.name
  }
  // id is date append to place lowercased without non-word characters.
  data.id = md5(`${slugify(data.place)}${data.date.format('YYYYMMDD')}`)
  return new Competition(data)
}

/**
 * Extract a competition's contest ranking from contest's id.
 * The competition's contests attribute will be added extracted ranking
 *
 * @param {String} url - full url of the contest ranking
 * @param {Object} logger - logger used
 * @param {Object} ctx - log context, including:
 * @param {Object} ctx.getDetails - operation context details
 * @param {String} ctx.getDetails.provider - current provider name
 * @param {Competition} ctx.getDetails.competition - competition fetched currently
 * @returns {Promise<Object>} extracted ranking; object with title and results
 */
const extractRanking = async (url, rank, logger, ctx) => {
  const {getDetails: {provider, competition: {place, dataUrls}}} = ctx
  if (url.endsWith('/Participants')) {
    // only participants list ? contest didn't started yet
    logger.debug(ctx, `contest isn't started yet (${rank}/${dataUrls.length})`)
    return
  }
  try {
    const bodyRaw = await request({
      url: url.endsWith('/Ranking') ? url : `${url}/Ranking`
    })
    const body = replaceUnallowed(bodyRaw.toString())
    if (body.includes('Not ranked yet')) {
      // contest is still in progress
      logger.debug(ctx, `contest is still in progress (${rank}/${dataUrls.length})`)
      return
    }
    if (body.includes('Cancelled')) {
      logger.debug(ctx, `contest was cancelled (${rank}/${dataUrls.length})`)
      return
    }
    // extract ranking
    const $ = cheerio.load(body, {decodeEntities: false})
    let title = $('h1').first().text().replace('Ranking of ', '')
    const subtitle = $('h1').first().next().text()
    if (subtitle) {
      title += ` ${subtitle.slice(0, subtitle.indexOf('taken'))
        .replace('The following results are from the WDSF', '')
        .trim()}`
    }
    const results = {}
    // for each heat (first is final)
    Array.from($('.list')).map(heat =>
      Array.from($(heat).find('tbody > tr')).forEach(row => {
        const name = $(row).find('td:nth-child(2)').text()
        const rank = parseInt($(row).find('td:nth-child(1)').text())
        if (!isNaN(rank)) {
          // no rank found ? excused or no-show couple
          results[titleize(removeAccents(name))] = rank
        }
      })
    )
    logger.debug(ctx, `got contest results (${rank}/${dataUrls.length})`)
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
 * Extract international competitions from the World Dance Sport Federation web site
 */
module.exports = class WDSFProvider extends Provider {
  /** @inheritdoc */
  async listResults (year) {
    const url = sprintf(`${this.opts.url}/${this.opts.list}`, year)
    const ctx = {listResults: {year, url, provider: this.opts.name}}
    this.opts.logger.debug(ctx, 'list competitions')
    try {
      const body = await request({url})
      // parse csv content
      const records = await parse(body.toString(), {columns: true})
      return mergeCompetitions(
        records.map(record => extractHeader(record, this.opts))
      ).map(competition => {
        // removes contest specific part of the url to only keep the competition url
        competition.url = competition.url.slice(0, competition.url.lastIndexOf('/'))
        return competition
      })
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
    const ctx = {getDetails: {
      competition,
      provider: this.opts.name
    }}
    this.opts.logger.debug(ctx, `get ${competition.dataUrls.length} contest(s) from urls`)

    // get all contests rankings
    const contests = await runSerially(competition.dataUrls.map((url, i) => () =>
      extractRanking(url, i + 1, this.opts.logger, ctx)
    ))
    // remove unavailable results
    competition.contests = contests.filter(n => n)
    return competition
  }
}
