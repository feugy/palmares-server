/**
 * Configure JWT authentication for a given Hapi server
 * Assumes key to be part of options
 */
exports.register = (server, options, next) =>
  // by using JWT plugin
  server.register(require('hapi-auth-jwt2'), err => {
    // configure authentication strategy
    server.auth.strategy('jwt', 'jwt', {
      key: options.key,
      validateFunc: (decoded, req, done) => done(null, true),
      verifyOptions: {
        algorithms: ['HS256']
      }
    })
    next(err)
  })

exports.register.attributes = {name: 'authentication'}
