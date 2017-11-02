const {extname, resolve} = require('path')
const {notFound} = require('boom')
const {promisify} = require('util')
const readFile = promisify(require('fs').readFile)
const app = require('../../../client')
const dist = resolve(__dirname, '..', '..', '..', 'client', 'dist')

/**
 * Configure static file hosting for built client
 */
exports.register = (server, options, next) =>
  // register inert that will add support for directory listing
  server.register([
    require('inert')
  ], () =>
    // load html file from dist for SSR re-hydratation
    readFile(resolve(dist, 'index.html'))
      .then(content => {
        const page = content.toString()
        // all route will endup in client/dist
        server.route({
          method: 'GET',
          path: '/{path*}',
          handler: async ({params: {path}}, reply) => {
            // if file is requested, load it with inert from dist folder
            if (extname(path)) {
              return reply.file(resolve(dist, path))
            }
            // otherwise, it's a client-side route
            try {
              // try to render route
              const html = app.toString(`/${path}`, {})
              // and place it within dist shell
              reply(page.replace(/<body>[\s\S]*<\/body>/i, html))
            } catch (err) {
              reply(notFound(err.message))
            }
          }
        })
      })
      .catch(error => {
        server.logger().warn({error}, `Couldn't find dist client: server side rendering disabled`)
      })
      .then(next)
  )

exports.register.attributes = {name: 'static'}
