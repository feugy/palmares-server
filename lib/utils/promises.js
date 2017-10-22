
/**
 * Run serially an array of functions returning promises
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
