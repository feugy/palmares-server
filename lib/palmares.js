const {flatten} = require('lodash/fp')
const {EventEmitter} = require('events')
const Joi = require('joi')
const Competition = require('./models/competition')
const Storage = require('./storages/storage')
const Provider = require('./providers/provider')
const {runWithPool} = require('./utils')

const optsSchema = Joi.object({
  storage: Joi.object().type(Storage).required(),
  providers: Joi.array().items(Joi.object().type(Provider)).required(),
  logger: Joi.object().required()
})

// array of instance currently updating
const updateInProgress = []
// event bus used to synchronise instances
const eventBus = new EventEmitter()
eventBus.setMaxListeners(0)

/**
 * Update a given instance of Palmarès, by downloaded new competition from all
 * providers, and storing them into storage.
 *
 * @param {Palmares} instance - Palmarès instance to update
 * @param {Number} year - year of downloaded competitions
 * @param {Object} ctx - logger context
 * @returns {Array<Competition>} new competitions (may be empty)
 */
const update = async (instance, year, ctx) => {
  // loads existing competition ids first
  if (!instance.competitionIds) {
    instance.logger.debug(ctx, `fetch existing competition ids`)
    instance.competitionIds = (await instance.storage.find(Competition, {}, ['id'], 0, 100000)).map(({id}) => id)
    instance.logger.info(ctx, `existing competition ids retrieved (${instance.competitionIds.length})`)
  }

  // then fetch all providers in parallel
  const newCompetitions = flatten(
    await Promise.all(
      instance.providers.map(async provider => {
        // get all new competitions
        const competitions = (await provider.listResults(year))
          .filter(({id}) => !instance.competitionIds.includes(id))
        await runWithPool(competitions.map(competition => async () => {
          try {
            await provider.getDetails(competition)
          } catch (err) {
            // ignored errored competitions for now
            competition.contests = []
          }
        }))
        // ignore empty competitions for now
        return competitions.filter(({contests}) => contests.length)
      })
    )
  )
  instance.logger.debug(ctx, `${newCompetitions.length} competitions found`)

  // save new competitions to storage
  await Promise.all(newCompetitions.map(async competition => {
    await instance.storage.save(competition)
    instance.competitionIds.push(competition.id)
  }))
  return newCompetitions
}

/**
 * Core module
 */
module.exports = class Palmares {
  /**
   * @constructor
   * Build a Palmarès service, by providing storage and providers
   *
   * @param {Storage} storage - storage used for competitions
   * @param {Array<Provider>} providers - various providers used for competitions
   */
  constructor (storage, providers, logger) {
    const err = optsSchema.validate({storage, providers, logger}).error
    if (err) {
      throw err
    }
    this.logger = logger
    this.storage = storage
    this.providers = providers
    this.competitionIds = null
  }

  /**
   * Seek for new competitions in each supported providers.
   * New competitions found that have been found are saved in storage.
   *
   * Only a single update operation can occur simultaneously.
   * Therefore, all update triggered during an update operation will received
   * the same results, whatever year is required
   *
   * @param {Number} year - year of fetched competitions
   * @returns {Object} update results:
   * @returns {Array<Competition>} competitions - new competitions found (may be empty)
   * @returns {Number} year - year for which competitions were retrieved
   */
  async update (year) {
    const ctx = {update: {year}}
    this.logger.debug(ctx, 'trigger update')
    // Only calls update once per instance
    if (updateInProgress.includes(this)) {
      this.logger.debug(ctx, 'queue for update end')
      // will only end when this instance will be updated
      return new Promise((resolve, reject) => {
        // callback on update events:
        const callback = (error, instance, results) => {
          // only process event for this instance
          if (instance === this) {
            // stop listening, and reject or resolve accordingly
            eventBus.removeListener('update', callback)
            if (error) {
              this.logger.debug(Object.assign({error}, ctx), 'queued update failed')
              return reject(error)
            }
            this.logger.debug(ctx, `queued update ended with ${results.competitions.length}` +
              ` competition(s) and actual year ${results.year}`)
            resolve(results)
          }
        }
        eventBus.on('update', callback)
      })
    }
    updateInProgress.push(this)
    try {
      // performs update
      const competitions = await update(this, year)
      const results = {competitions, year}
      this.logger.info(ctx, `update successful with ${competitions.length} competition(s) for year ${year}`)
      // release other instances
      updateInProgress.splice(updateInProgress.indexOf(this), 1)
      eventBus.emit('update', null, this, results)
      return results
    } catch (error) {
      this.logger.warn(Object.assign({error}, ctx), 'update failed')
      // remove from progress update, otherwise no one could call it then !
      updateInProgress.splice(updateInProgress.indexOf(this), 1)
      eventBus.emit('update', error, this)
      throw error
    }
  }
}
