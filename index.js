const {Server} = require('hapi')

const server = new Server()
const port = process.env.PORT || 5000
server.connection({port})

server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => reply('Hello, world!')
})

server.start(err => {
  if (err) {
    throw err
  }
  console.log(`Server running at: ${server.info.uri}`)
})
