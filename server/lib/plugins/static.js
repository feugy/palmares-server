/**
 * Configure static file hosting for built client
 */
exports.register = (server, options, next) =>
  // register inert that will add support for directory listing
  server.register(require('inert'), err => {
    // all route will endup in client/dist
    server.route({
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: 'client/dist'
        }
      }
    })

    next(err)
  })

exports.register.attributes = {name: 'static'}
