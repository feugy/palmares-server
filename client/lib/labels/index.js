const {getOr} = require('lodash/fp')
const {safeLoad} = require('js-yaml')
const fs = require('fs')
const path = require('path')

// for Brfs to replace these lines, they must:
// 1. not use destructuring, 2. use readFileSync or readFile, 3. not be embedded in expression

// Read default labels, parse as yaml, and make them available for use
const labels = safeLoad(fs.readFileSync(path.resolve(__dirname, 'default.yml')))

/**
 * Get a given i18n value by its path
 * Supports variable substitutions through JS template string.
 * All properties of `values` parameter can be referenced and used.
 *
 * @param {String}    path - full path to label: `title.main`
 * @param {Object}    values - object containing values for substitution
 * @returns {String} i18n value
 */
exports.i18n = (path, values = null) => {
  const tpl = getOr(`ERR: path '${path}' not found`, path)(labels)
  if (!values) {
    return tpl
  }
  try {
    const keys = Object.getOwnPropertyNames(values).join(',')
    // Because we want to take advantage of template string:
    // eslint-disable-next-line no-new-func
    const interpolate = new Function('obj', `const {${keys}} = obj; return \`${tpl}\``)
    return interpolate(values)
  } catch (err) {
    return `ERR: '${tpl}', ${err.message}`
  }
}
