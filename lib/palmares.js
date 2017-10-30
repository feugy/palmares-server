const {flatten} = require('lodash/fp')
const {EventEmitter} = require('events')
const Joi = require('joi')
const Competition = require('./models/competition')
const Storage = require('./storages/storage')
const Provider = require('./providers/provider')
const {runWithPool} = require('./utils')

const optsSchema = Joi.object({
  storage: Joi.object().type(Storage).required(),
  providers: Joi.array().items(Joi.object().type(Provider)).required()
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
 */
const update = async (instance, year) => {
  // loads existing competition ids first
  if (!instance.competitionIds) {
    instance.competitionIds = (await instance.storage.find(Competition, {}, ['id'])).map(({id}) => id)
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
  constructor (storage, providers) {
    const err = optsSchema.validate({storage, providers}).error
    if (err) {
      throw err
    }
    this.storage = storage
    this.providers = providers
    this.competitionIds = null
  }

  /**
   * Seek for new competitions in each supported providers.
   * New competitions found that have been found are saved in storage
   *
   * @param {Number} year - year of fetched competitions
   * @returns {Array<Competition>} new competitions found (may be empty)
   */
  async update (year) {
    // Only calls update once per instance
    if (updateInProgress.includes(this)) {
      // will only end when this instance will be updated
      return new Promise((resolve, reject) => {
        // callback on update events:
        const callback = (err, instance, competitions) => {
          // only process event for this instance
          if (instance === this) {
            // stop listening, and reject or resolve accordingly
            eventBus.removeListener('update', callback)
            if (err) {
              return reject(err)
            }
            resolve(competitions)
          }
        }
        eventBus.on('update', callback)
      })
    }
    updateInProgress.push(this)
    try {
      // performs update
      const competitions = await update(this, year)
      // release other instances
      updateInProgress.splice(updateInProgress.indexOf(this), 1)
      eventBus.emit('update', null, this, competitions)
      return competitions
    } catch (err) {
      // remove from progress update, otherwise no one could call it then !
      updateInProgress.splice(updateInProgress.indexOf(this), 1)
      eventBus.emit('update', err, this)
      throw err
    }
  }
}
