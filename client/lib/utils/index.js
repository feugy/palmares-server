/**
 * Async implementation of setTimeout:
 *
 * // setTimeout(doThings, 10)
 * await timeout(10)
 * doThings()
 *
 * @param [Number] [ms = 0] - number of milliseconds to wait
 * @return [Promise] resolved after ms milliseconds
 */
exports.timeout = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
