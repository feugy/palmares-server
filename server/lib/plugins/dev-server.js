const {resolve} = require('path')
const {notFound} = require('boom')

/**
 * Register Bankai dev server with hot reloading.
 */
exports.register = async server => {
  // differed require to keep it in dev dependencies
  const bankai = require('bankai/http')
  const compiler = bankai(resolve(__dirname, '..', '..', '..', 'client')) //, {quiet: true})
  compiler.state.port = server.info.port
  // TODO when no document is compiled, server will fail

  server.route({
    method: 'OPTION',
    path: '/{param*}',
    handler: (req, h) =>
      h.response()
        .header('access-control-allow-origin', '*')
        .header('access-control-allow-methods', '*')
        .header('access-control-allow-headers', '*')
        .header('access-control-allow-credentials', true)
        .code(200)
  })

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: ({raw: {req, res}}, h) =>
      new Promise((resolve, reject) => {
        res.on('finish', () => resolve(null))
        res.on('error', reject)
        compiler(req, res, () => reject(notFound(`No route found for ${req.url}`)))
      })
  })
}

exports.name = 'dev-server'
