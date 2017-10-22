const {Server} = require('hapi')
const {MongoClient} = require('mongodb')

const server = new Server({debug: {request: ['error']}})
const port = process.env.PORT || 5000
server.connection({port})

const connectDb = {
  register: (server, options, next) => {
    const url = process.env.DB_URL || 'mongodb://localhost:27017/palmares'
    MongoClient.connect(url)
      .then(db => {
        server.decorate('request', 'db', db)
        console.log('Enrich request with connection')
        next()
      })
      .catch(next)
  }
}
connectDb.register.attributes = {
  name: 'connect-db',
  version: '1.0.0'
}

server.register(connectDb, err => {
  if (err) {
    throw err
  }

  server.start(err => {
    if (err) {
      throw err
    }
    console.log(`Server running at: ${server.info.uri}`)
  })
})

server.route({
  method: 'GET',
  path: '/',
  handler: (request, reply) => {
    reply(
      request.db.collection('test')
        .findAndModify({metrics: 'hits'}, [], {$inc: {value: 1}}, {new: true, upsert: true})
        .then(({value: doc}) => `Hello ! you're the hit #${doc.value}`)
    )
  }
})
