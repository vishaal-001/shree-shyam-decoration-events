const express = require('express')
const app = express()
const config = require('./utils/config')
const logger = require('./utils/logger')
const mongoose = require('mongoose')

logger.info('connecting to mongodb', config.MONGODB_URI)
mongoose
  .connect(config.MONGODB_URI, { family: 4 })
  .then(() => {
    logger.info('Connected to MongoDB')
  })
  .catch((error) => {
    logger.error('Failed to connect MongoDB', error)
  })

app.get('/', (request, response) => {
  response.send('<h2>Vishal is here<h2>')
})

module.exports = app
