const serviceRouter = require('express').Router()
const Service = require('../models/Service')
const upload = require('../middleware/upload')
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../utils/cloudinary')
const logger = require('../utils/logger')
const parseJSON = require('../utils/parseJson')

// Get route
serviceRouter.get('/', async (request, response) => {
  try {
    const allServices = await Service.find({
      isActive: true,
      isDeleted: false,
    }).sort({ displayOrder: 1 })

    return response
      .status(200)
      .json({ success: true, message: 'All services.', data: allServices })
  } catch (error) {
    logger.error('Failed to fetch services.', error)

    return response.status(500).json({
      success: false,
      message: 'Failed to fetch services.',
    })
  }
})

// Post route
serviceRouter.post(
  '/',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    {
      name: 'coverImage',
      maxCount: 1,
    },
  ]),
  async (request, response) => {
    let thumbnailResult
    let coverImageResult
    try {
      const name = request.body.name
      const description = request.body.description
      const features = parseJSON(request.body.features, 'features')
      const metaTitle = request.body.metaTitle
      const metaDescription = request.body.metaDescription
      const displayOrder = Number(request.body.displayOrder)

      if (
        request.body.displayOrder === undefined ||
        request.body.displayOrder.trim() === '' ||
        !Number.isInteger(displayOrder) ||
        displayOrder < 1
      ) {
        return response.status(400).json({
          success: false,
          message: 'A valid display order is required.',
        })
      }

      const thumbnailFile = request.files?.thumbnail?.[0]
      if (!thumbnailFile) {
        return response
          .status(400)
          .json({ success: false, message: 'Thumbnail is required.' })
      }

      const coverImageFile = request.files?.coverImage?.[0]
      if (!coverImageFile) {
        return response.status(400).json({
          success: false,
          message: 'Cover image is required.',
        })
      }

      thumbnailResult = await uploadToCloudinary(
        thumbnailFile.buffer,
        'ssde/service/thumbnail',
      )
      logger.info('ThumbnailResult', thumbnailResult)

      coverImageResult = await uploadToCloudinary(
        coverImageFile.buffer,
        'ssde/service/coverImage',
      )
      logger.info('CoverImageResult', coverImageResult)

      const service = await Service.create({
        name,
        description,
        features,
        metaTitle,
        metaDescription,
        displayOrder,

        thumbnail: {
          url: thumbnailResult.secure_url,
          publicId: thumbnailResult.public_id,
        },

        coverImage: {
          url: coverImageResult.secure_url,
          publicId: coverImageResult.public_id,
        },
      })

      response.status(201).json({
        success: true,
        message: 'Service saved successfully',
        data: service,
      })
    } catch (error) {
      logger.error('Failed to save service.', error)

      if (thumbnailResult?.public_id) {
        try {
          await deleteFromCloudinary(thumbnailResult.public_id)
        } catch (cleanupError) {
          logger.error(
            'Failed to delete thumbnail from cloudinary.',
            cleanupError,
          )
        }
      }

      if (coverImageResult?.public_id) {
        try {
          await deleteFromCloudinary(coverImageResult.public_id)
        } catch (cleanupError) {
          logger.error(
            'Failed to delete cover image from cloudinary.',
            cleanupError,
          )
        }
      }

      return response.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : 'Failed to save service.',
      })
    }
  },
)

// Patch route
serviceRouter.patch('/:id', async (request, response) => {})

// Delete route
serviceRouter.delete('/:id', async (request, response) => {})

module.exports = serviceRouter
