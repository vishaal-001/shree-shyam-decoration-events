const serviceRouter = require('express').Router()
const Service = require('../models/Service')
const upload = require('../middleware/upload')
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../utils/cloudinary')
const logger = require('../utils/logger')
const parseJSON = require('../utils/parseJson')
const authenticateAdmin = require('../middleware/auth')

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
  authenticateAdmin,
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
      // logger.info('ThumbnailResult', thumbnailResult)

      coverImageResult = await uploadToCloudinary(
        coverImageFile.buffer,
        'ssde/service/coverImage',
      )
      // logger.info('CoverImageResult', coverImageResult)

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

      return response.status(201).json({
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
serviceRouter.patch(
  '/:id',
  authenticateAdmin,
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (request, response) => {
    let thumbnailResult
    let coverImageResult
    let oldThumbnailPublicId
    let oldCoverImagePublicId
    let isDatabaseSaved = false
    try {
      const existingService = await Service.findOne({
        _id: request.params.id,
        isDeleted: false,
      })
      if (!existingService) {
        return response.status(404).json({
          success: false,
          message: 'Service not found.',
        })
      }

      if (request.body.name !== undefined) {
        existingService.name = request.body.name
      }
      if (request.body.description !== undefined) {
        existingService.description = request.body.description
      }
      if (request.body.features !== undefined) {
        existingService.features = parseJSON(request.body.features, 'features')
      }
      if (request.body.metaTitle !== undefined) {
        existingService.metaTitle = request.body.metaTitle
      }
      if (request.body.metaDescription !== undefined) {
        existingService.metaDescription = request.body.metaDescription
      }
      if (request.body.displayOrder !== undefined) {
        const displayOrder = Number(request.body.displayOrder)
        if (
          request.body.displayOrder.trim() === '' ||
          !Number.isInteger(displayOrder) ||
          displayOrder < 1
        ) {
          return response.status(400).json({
            success: false,
            message: 'A valid display order is required.',
          })
        }
        existingService.displayOrder = displayOrder
      }

      const coverImageFile = request.files?.coverImage?.[0]
      if (coverImageFile) {
        oldCoverImagePublicId = existingService.coverImage.publicId
        coverImageResult = await uploadToCloudinary(
          coverImageFile.buffer,
          'ssde/service/coverImage',
        )
        existingService.coverImage = {
          url: coverImageResult.secure_url,
          publicId: coverImageResult.public_id,
        }
      }
      const thumbnailFile = request.files?.thumbnail?.[0]
      if (thumbnailFile) {
        oldThumbnailPublicId = existingService.thumbnail.publicId
        thumbnailResult = await uploadToCloudinary(
          thumbnailFile.buffer,
          'ssde/service/thumbnail',
        )
        existingService.thumbnail = {
          url: thumbnailResult.secure_url,
          publicId: thumbnailResult.public_id,
        }
      }

      await existingService.save()
      isDatabaseSaved = true

      if (oldCoverImagePublicId) {
        try {
          await deleteFromCloudinary(oldCoverImagePublicId)
        } catch (cleanupError) {
          logger.error('Failed to delete old cover image.', cleanupError)
        }
      }
      if (oldThumbnailPublicId) {
        try {
          await deleteFromCloudinary(oldThumbnailPublicId)
        } catch (cleanupError) {
          logger.error('Failed to delete old thumbnail.', cleanupError)
        }
      }

      return response.status(200).json({
        success: true,
        message: 'Service updated successfully.',
        data: existingService,
      })
    } catch (error) {
      logger.error('Failed to update service.', error)

      if (!isDatabaseSaved && coverImageResult?.public_id) {
        try {
          await deleteFromCloudinary(coverImageResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to delete new cover image.', cleanupError)
        }
      }
      if (!isDatabaseSaved && thumbnailResult?.public_id) {
        try {
          await deleteFromCloudinary(thumbnailResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to delete new thumbnail.', cleanupError)
        }
      }

      return response.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : 'Failed to update service.',
      })
    }
  },
)

// Delete route
serviceRouter.delete('/:id', authenticateAdmin, async (request, response) => {
  try {
    const existingService = await Service.findOne({
      _id: request.params.id,
      isDeleted: false,
    })
    if (!existingService) {
      return response.status(404).json({
        success: false,
        message: 'Service not found.',
      })
    }

    existingService.isDeleted = true
    existingService.deletedAt = new Date()

    await existingService.save()

    response.status(200).json({
      success: true,
      message: 'Service deleted successfully.',
      data: existingService,
    })
  } catch (error) {
    logger.error('Failed to delete service.', error)

    return response.status(500).json({
      success: false,
      message: 'Failed to delete service.',
    })
  }
})

module.exports = serviceRouter
