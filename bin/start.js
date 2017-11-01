// read env variables
require('dotenv').config()
const {join} = require('path')
const {safeLoad} = require('js-yaml')
const {readFileSync} = require('fs')
const {merge} = require('lodash/fp')
const startServer = require('../server/lib/server')

startServer(merge({
  port: process.env.PORT,
  storage: {
    url: process.env.MONGO_URL
  },
  auth: {
    key: process.env.JWT_KEY
  }
})(safeLoad(readFileSync(join('conf', 'default.yml')))))
