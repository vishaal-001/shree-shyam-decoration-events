const express = require('express')
const app = express()
const config = require('./utils/config')
const logger = require('./utils/logger')
const mongoose = require('mongoose')
const websiteSettingsRouter = require('./controllers/websiteSettings')
const cloudinary = require('cloudinary').v2

logger.info('connecting to mongodb')
mongoose
  .connect(config.MONGODB_URI, { family: 4 })
  .then(() => {
    logger.info('Connected to MongoDB')
  })
  .catch((error) => {
    logger.error('Failed to connect MongoDB', error)
  })

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
})

logger.info('Cloudinary configured successfully.')

app.use(express.json())

app.get('/', (request, response) => {
  response.send('<h2>Vishal is here<h2>')
})

app.use('/api/settings', websiteSettingsRouter)

module.exports = app
