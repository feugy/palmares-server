const {resolve} = require('path')
const {createServer} = require('http')

/**
 * Register Bankai dev server with hot reloading.
 */
exports.register = async server => {
  // differed require to keep it in dev dependencies
  const bankai = require('bankai/http')
  const compiler = bankai(resolve(__dirname, '..', '..', '..', 'client'), {
    reload: true,
    quiet: true,
    watch: true
  })
  const port = server.info.port + 1

  // dev server compiles resources on the fly
  const devServer = createServer((req, res) => {
    compiler(req, res, () => {
      res.statusCode = 404
      res.end('not found')
    })
  })

  // Proxy to dev server
  await server.register({
    plugin: require('h2o2'),
    options: {passThrough: true}
  })
  server.route({
    method: '*',
    path: '/{param*}',
    handler: {
      proxy: {
        uri: `{protocol}://localhost:${port}{path}`
      }
    }
  })

  // start dev server and listen
  return new Promise((resolve, reject) => {
    devServer.on('error', reject)
    devServer.listen(port, resolve)
  })
}

exports.name = 'dev-server'
