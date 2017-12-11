/**
 * Configure JWT authentication for a given Hapi server
 * Assumes key to be part of options
 */
exports.register = async (server, options) => {
  // by using JWT plugin
  await server.register(require('hapi-auth-jwt2'))
  // configure authentication strategy
  server.auth.strategy('jwt', 'jwt', {
    key: options.key,
    validate: decoded => ({valid: true}),
    verifyOptions: {
      algorithms: ['HS256']
    }
  })
}

exports.name = 'authentication'
