
/**
 * Run serially an array of functions returning promises.
 * Bail at first error.
 *
 * @param {Array<Function>} fcts - array of function, called without any argument, returning a promise
 * @returns {Promise<Array>} resolved when all promises are finished, with ordered results
 */
exports.runSerially = fcts => {
  const results = []
  return fcts.reduce((current, next) => {
    return current
      .then(next)
      .then(res => {
        results.push(res)
      })
  }, Promise.resolve()).then(() => results)
}

/**
 * Using a pool of workers, run in parallel available fcts returning promises.
 * This ensure a maximum concurrency without running serially.
 * Bail at first error.
 *
 * @param {Array<Function>} fcts - array of function, called without any argument, returning a promise
 * @param {Number} [poolSize = 3] - maximum of workers in pool
 * @returns {Promise} resolved when all promises are finished
 */
exports.runWithPool = (fcts, poolSize = 3) => {
  const results = []
  // command chain: take first available FUNCTION and run it, then iterate until depletion
  const chain = () => {
    const i = fcts.length - 1
    const next = fcts.shift()
    return next
      ? next().then(res => {
        results[i] = res
        return chain()
      })
      : Promise.resolve()
  }
  // run chains in parallel
  return Promise.all(Array.from({length: poolSize}).map(chain))
    .then(() => results.reverse())
}
