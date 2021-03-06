const outputs = [{
  reporter: 'console',
  output: 'stdout'
}, {
  reporter: 'html',
  output: 'coverage/index.html'
}]

if (process.env.CI) {
  outputs.push({
    reporter: 'lcov',
    output: 'coverage/lcov.info'
  })
}

module.exports = {
  coverage: true,
  leaks: true,
  globals: '__core-js_shared__,core,System,asap,Observable,regeneratorRuntime,_babelPolyfill',
  lint: true,
  'lint-warnings-threshold': 10,
  threshold: 95,
  timeout: 4e3,
  transform: '../node_modules/lab-espower-transformer',
  verbose: true,
  reporter: outputs.map(o => o.reporter),
  output: outputs.map(o => o.output)
}
