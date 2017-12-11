const {extname, resolve} = require('path')
const {notFound} = require('boom')
const {promisify} = require('util')
const readFile = promisify(require('fs').readFile)
const app = require('../../../client')
const dist = resolve(__dirname, '..', '..', '..', 'client', 'dist')

/**
 * Configure static file hosting for built client
 */
exports.register = async server => {
  // register inert that will add support for directory listing
  await server.register(require('inert'))
  // load html file from dist for SSR re-hydratation
  try {
    const page = (await readFile(resolve(dist, 'index.html'))).toString()
    // all route will endup in client/dist
    server.route({
      method: 'GET',
      path: '/{path*}',
      handler: async ({params: {path}}, h) => {
        // if file is requested, load it with inert from dist folder
        if (extname(path)) {
          return h.file(resolve(dist, path))
        }
        // otherwise, it's a client-side route
        try {
          // try to render route
          const html = app.toString(`/${path}`, {})
          // and place it within dist shell
          return page.replace(/<body>[\s\S]*<\/body>/i, html)
        } catch (err) {
          throw notFound(err.message)
        }
      }
    })
  } catch (error) {
    server.logger().warn({error}, `Couldn't find dist client: server side rendering disabled`)
  }
}

exports.name = 'static'
