const packageRouter = require('express').Router()
const Package = require('../models/Package')
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../utils/cloudinary')
const logger = require('../utils/logger')
const parseJSON = require('../utils/parseJson')
const Service = require('../models/Service')
const upload = require('../middleware/upload')
const mongoose = require('mongoose')

//GET Route
packageRouter.get('/', async (request, response) => {
  try {
    const allPackages = await Package.find({
      isActive: true,
      isDeleted: false,
    }).sort({ displayOrder: 1 })

    return response.status(200).json({
      success: true,
      message: 'All packages',
      data: allPackages,
    })
  } catch (error) {
    logger.error('Failed to fetch packages.', error)

    return response.status(500).json({
      success: false,
      message: 'Failed to fetch packages.',
    })
  }
})

//POST Route
packageRouter.post(
  '/',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (request, response) => {
    let coverImageResult
    let thumbnailResult
    try {
      const name = request.body.name
      const description = request.body.description
      const features = parseJSON(request.body.features, 'features')
      const metaTitle = request.body.metaTitle
      const metaDescription = request.body.metaDescription
      const displayOrder = Number(request.body.displayOrder)
      const serviceId = request.body.serviceId

      let startingPrice

      if (
        request.body.startingPrice !== undefined &&
        request.body.startingPrice.trim() !== ''
      ) {
        startingPrice = Number(request.body.startingPrice)

        if (!Number.isFinite(startingPrice) || startingPrice < 0) {
          return response.status(400).json({
            success: false,
            message: 'A valid starting price is required.',
          })
        }
      }

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

      if (!mongoose.isValidObjectId(serviceId)) {
        return response.status(400).json({
          success: false,
          message: 'Service id invalid.',
        })
      }
      const service = await Service.findOne({
        _id: serviceId,
        isActive: true,
        isDeleted: false,
      })

      if (!service) {
        return response.status(400).json({
          success: false,
          message: 'Service is not valid.',
        })
      }

      const coverImageFile = request.files?.coverImage?.[0]
      if (!coverImageFile) {
        return response.status(400).json({
          success: false,
          message: 'Cover image is required.',
        })
      }

      const thumbnailFile = request.files?.thumbnail?.[0]
      if (!thumbnailFile) {
        return response.status(400).json({
          success: false,
          message: 'Thumbnail is required.',
        })
      }
      thumbnailResult = await uploadToCloudinary(
        thumbnailFile.buffer,
        'ssde/package/thumbnail',
      )

      coverImageResult = await uploadToCloudinary(
        coverImageFile.buffer,
        'ssde/package/coverImage',
      )

      const newPackage = await Package.create({
        serviceId,
        name,
        description,
        features,
        metaTitle,
        metaDescription,
        displayOrder,
        startingPrice,

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
        message: 'Package saved successfully',
        data: newPackage,
      })
    } catch (error) {
      logger.error('Failed to save package.', error)

      if (coverImageResult?.public_id) {
        try {
          await deleteFromCloudinary(coverImageResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to clean up package cover image.', cleanupError)
        }
      }

      if (thumbnailResult?.public_id) {
        try {
          await deleteFromCloudinary(thumbnailResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to clean up package thumbnail.', cleanupError)
        }
      }

      return response.status(error.statusCode || 500).json({
        success: false,
        message: 'Failed to save package.',
      })
    }
  },
)

//PATCH Route
packageRouter.patch(
  '/:id',
  upload.fields([
    {
      name: 'coverImage',
      maxCount: 1,
    },
    {
      name: 'thumbnail',
      maxCount: 1,
    },
  ]),
  async (request, response) => {
    let oldCoverImagePublicId
    let oldThumbnailPublicId
    let coverImageResult
    let thumbnailResult
    let isDatabaseSaved = false
    try {
      if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({
          success: false,
          message: 'Invalid package ID.',
        })
      }
      const existingPackage = await Package.findOne({
        _id: request.params.id,
        isDeleted: false,
      })

      if (!existingPackage) {
        return response.status(404).json({
          success: false,
          message: 'Package not found.',
        })
      }

      if (request.body.name !== undefined) {
        existingPackage.name = request.body.name
      }
      if (request.body.description !== undefined) {
        existingPackage.description = request.body.description
      }
      if (request.body.features !== undefined) {
        existingPackage.features = parseJSON(request.body.features, 'features')
      }
      if (request.body.metaTitle !== undefined) {
        existingPackage.metaTitle = request.body.metaTitle
      }
      if (request.body.metaDescription !== undefined) {
        existingPackage.metaDescription = request.body.metaDescription
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
        existingPackage.displayOrder = displayOrder
      }

      if (request.body.startingPrice !== undefined) {
        if (request.body.startingPrice.trim() === '') {
          existingPackage.startingPrice = undefined
        } else {
          const startingPrice = Number(request.body.startingPrice)

          if (!Number.isFinite(startingPrice) || startingPrice < 0) {
            return response.status(400).json({
              success: false,
              message: 'A valid starting price is required.',
            })
          }

          existingPackage.startingPrice = startingPrice
        }
      }

      const coverImageFile = request.files?.coverImage?.[0]
      if (coverImageFile) {
        oldCoverImagePublicId = existingPackage.coverImage.publicId
        coverImageResult = await uploadToCloudinary(
          coverImageFile.buffer,
          'ssde/package/coverImage',
        )
        existingPackage.coverImage = {
          url: coverImageResult.secure_url,
          publicId: coverImageResult.public_id,
        }
      }
      const thumbnailFile = request.files?.thumbnail?.[0]
      if (thumbnailFile) {
        oldThumbnailPublicId = existingPackage.thumbnail.publicId
        thumbnailResult = await uploadToCloudinary(
          thumbnailFile.buffer,
          'ssde/package/thumbnail',
        )
        existingPackage.thumbnail = {
          url: thumbnailResult.secure_url,
          publicId: thumbnailResult.public_id,
        }
      }

      await existingPackage.save()
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
        message: 'Package updated successfully.',
        data: existingPackage,
      })
    } catch (error) {
      logger.error('Failed to update package.', error)

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
        message: error.statusCode ? error.message : 'Failed to update package.',
      })
    }
  },
)

//DELETE Route
packageRouter.delete('/:id', async(request, response) => {
  try{
    if(!mongoose.isValidObjectId(request.params.id)){
      return response.status(400).json({
        success:false,
        message:'Invalid id.'
      })
    }

  const existingPackage = await Package.findOne({_id:request.params.id, isDeleted:false})

  if(!existingPackage){
    return response.status(404).json({
        success:false,
        message:'Package not found.'})
  }

  existingPackage.isDeleted = true
  existingPackage.deletedAt = new Date()

  await existingPackage.save()
   
  return response.status(200).json({
    success: true, 
    message: 'Package has been deleted successfully.'
  })
  }catch(error){
    logger.error('Failed to delete package.', error)

    return response.status(500).json({
      success:false,
      message:'Failed to delete package.'
    })
  }
})

module.exports = packageRouter
