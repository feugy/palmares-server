module.exports = {
  coverage: true,
  leaks: true,
  globals: '__core-js_shared__', // came from power-assert
  lint: true,
  'lint-warnings-threshold': 100,
  threshold: 95,
  transform: './node_modules/lab-espower-transformer',
  verbose: true,
  reporter: ['html', 'console'],
  output: ['coverage/index.html', 'stdout']
}
