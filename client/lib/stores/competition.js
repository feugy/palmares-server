const axios = require('axios')
const {find} = require('lodash/fp')
const {timeout} = require('../utils')
const Competition = require('../../../server/lib/models/competition')

const FETCH_COMPETITIONS = 'competitions:fetch'
const FETCH_CURRENT_COMPETITION = 'competitions:fetchCurrent'

/**
 *
 * @param {Object}                  state - application global state
 * @param {String}                    state.title - current page title
 * @param {Competition|Error}         state.competitions - competition list
 * @param {Array<Competition>|Error}  state.currentCompetition - displayed competition
 * @param {Object}                  emitter - event bus
 */
module.exports = (state, emitter) => {
  const {RENDER} = state.events

  // add custom events
  state.events = {
    ...state.events,
    FETCH_COMPETITIONS,
    FETCH_CURRENT_COMPETITION
  }

  // init store
  state.competitions = null
  state.currentCompetition = null

  /**
   * Fetch competition list if needed from `/api/competition`.
   * Set state.competitions to results, possibly an error.
   */
  const fetchList = async () => {
    try {
      const res = await axios.get('/api/competition')
      state.competitions = res.data.values.map(c => new Competition(c))
    } catch (err) {
      state.competitions = new Error(`failed to fetch competition list: ${err.message}`)
    }
    emitter.emit(RENDER)
  }

  /**
   * Fetch competition list if needed, then return competition by id.
   * Set state.currentCompetition to result, possibly an error.
   */
  const fetchCurrent = async id => {
    if (!state.competitions) {
      await fetchList()
    }
    if (state.competitions instanceof Error) {
      state.currentCompetition = new Error(`can't fetch competition list`)
    } else {
      state.currentCompetition = find({id})(state.competitions)
      if (!state.currentCompetition) {
        state.currentCompetition = new Error(`no competition for id ${id}`)
      }
    }
    // in case of list already loaded, defer rendering to avoid being synchronous
    await timeout()
    emitter.emit(RENDER)
  }

  // bound events
  emitter.on(FETCH_COMPETITIONS, fetchList)
  emitter.on(FETCH_CURRENT_COMPETITION, fetchCurrent)
}
