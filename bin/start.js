// read env variables
require('dotenv').config()

const {join} = require('path')
const {readConf} = require('../server/lib/utils')
const startServer = require('../server/lib/server')

readConf(join('conf', 'default.yml')).then(conf => startServer(conf))
