const {flattenDeep, flow, uniq} = require('lodash/fp')
const {slugify, titleize} = require('underscore.string.fp')
const {sprintf} = require('sprintf-js')
const request = require('request-promise-native')
const moment = require('moment')
const cheerio = require('cheerio')
const md5 = require('md5')
const parse = require('csv-parser')
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
 * @param {String} opts.dateFormat -
 * @param {String} opts.url -
 * @param {String} opts.details -
 * @returns {Competition} extracted competition, may be undefined
 */
const extractHeader = (record, opts, year) => {
  const data = {
    // place is city, removes parenthesis information if present
    place: titleize(removeAccents(record.Location).replace(/\(\s*\w+\s*\)/, '').trim()),
    date: moment(record.Date, opts.dateFormat),
    // removes contest specific part of the url to only keep the competition url
    url: record.CompetitionUrl.slice(0, record.CompetitionUrl.lastIndexOf('/') + 1),
    provider: 'wdsf'
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
 * @returns {Promise<Object>} extracted ranking; object with title and results
 */
const extractRanking = (url, name, place) => {
  if (url.endsWith('/Participants')) {
    // only participants list ? contest didn't started yet
    return Promise.resolve()
  }
  return request({
    url: url.endsWith('/Ranking') ? url : `${url}/Ranking`
  }).then(bodyRaw => {
    const body = replaceUnallowed(bodyRaw.toString())
    if (body.includes('Not ranked yet')) {
      // contest is still in progress
      return
    }
    if (body.includes('Cancelled')) {
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
    return {title, results}
  })
}

/**
 * Extract international competitions from the World Dance Sport Federation web site
 */
module.exports = class WDSFProvider extends Provider {
  /**
   * @see Provider.listResults()
   */
  listResults (year) {
    return request({
      url: sprintf(`${this.opts.url}/${this.opts.list}`, year)
    }).then(body => {
      return new Promise((resolve, reject) => {
        // parse csv content
        const competitions = []
        const parser = parse()
        parser.on('readable', () => {
          for (let record; (record = parser.read());) {
            competitions.push(extractHeader(record, this.opts))
          }
        }).on('finish', () =>
          resolve(mergeCompetitions(competitions))
        ).on('error', reject)
        parser.write(body.toString())
        parser.end()
      })
    }).catch(handleRequestError(`failed to fetch results from ${this.opts.name}`))
  }

  /**
   * @see Provider.getDetails()
   */
  getDetails (competition) {
    // request contests list, for each known urls
    return runSerially(competition.dataUrls.map(url => () =>
      request({
        url
      }).then(body => {
        // extract contests ranking ids
        const $ = cheerio.load(replaceUnallowed(body.toString()), {decodeEntities: true})
        return Array.from($('.competitionList h3'))
          .map((day, i) => {
            // find competition list for the competition date only
            if (!competition.date.isSame(moment($(day).text(), 'D MMMM YYYY'))) {
              return []
            }
            return Array.from($(`.competitionList table:nth-of-type(${i + 1}) a`))
              .filter(link => $(link).text() !== 'Upcoming')
              .map(link => `${this.opts.url}${$(link).attr('href')}`)
          })
      }).catch(handleRequestError(`failed to fetch contests from ${this.opts.name} ${competition.place}`))
    )).then(rawUrls => {
      const urls = flow(flattenDeep, uniq)(rawUrls)
      competition.contests = []
      // get all contests rankings
      return runSerially(urls.map(url => () =>
        extractRanking(url, this.opts.name, competition.place)
          .catch(handleRequestError(`failed to fetch contest ranking from ${this.opts.name} ${competition.place}`))
      )).then(contests => {
        // remove unavailable results
        competition.contests = contests.filter(n => n)
        return competition
      })
    })
  }
}
