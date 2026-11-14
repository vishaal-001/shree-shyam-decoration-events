const galleryRouter = require('express').Router()
const Gallery = require('../models/Gallery')
const Service = require('../models/Service')
const Package = require('../models/Package')
const GalleryCategory = require('../models/GalleryCategory')
const mongoose = require('mongoose')

const upload = require('../middleware/upload')
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../utils/cloudinary')

const logger = require('../utils/logger')

// GET Route
galleryRouter.get('/', async (request, response) => {
  try {
    const allGalleryItems = await Gallery.find({
      isActive: true,
      isDeleted: false,
    }).sort({ displayOrder: 1 })

    return response.status(200).json({
      success: true,
      message: 'Gallery items fetched successfully.',
      data: allGalleryItems,
    })
  } catch (error) {
    logger.error('Failed to fetch gallery items.', error)

    return response.status(500).json({
      success: false,
      message: 'Failed to fetch gallery items.',
    })
  }
})

//POST Route
galleryRouter.post('/', upload.single('media'), async (request, response) => {
  let uploadResult

  try {
    const {
      serviceId,
      packageId,
      categoryId,
      title,
      description,
      mediaType,
      provider,
      url,
      altText,
      displayOrder,
      isFeatured,
    } = request.body

    const file = request.file

    // Validate Service ID
    if (!mongoose.isValidObjectId(serviceId)) {
      return response.status(400).json({
        success: false,
        message: 'Invalid service ID.',
      })
    }

    // Validate Category ID
    if (!mongoose.isValidObjectId(categoryId)) {
      return response.status(400).json({
        success: false,
        message: 'Invalid category ID.',
      })
    }

    // Validate Service
    const existingService = await Service.findOne({
      _id: serviceId,
      isActive: true,
      isDeleted: false,
    })

    if (!existingService) {
      return response.status(404).json({
        success: false,
        message: 'Active service not found.',
      })
    }

    // Validate Category
    const existingCategory = await GalleryCategory.findOne({
      _id: categoryId,
      isActive: true,
      isDeleted: false,
    })

    if (!existingCategory) {
      return response.status(404).json({
        success: false,
        message: 'Active gallery category not found.',
      })
    }

    // Validate optional Package
    let existingPackage

    if (packageId) {
      if (!mongoose.isValidObjectId(packageId)) {
        return response.status(400).json({
          success: false,
          message: 'Invalid package ID.',
        })
      }

      existingPackage = await Package.findOne({
        _id: packageId,
        serviceId,
        isActive: true,
        isDeleted: false,
      })

      if (!existingPackage) {
        return response.status(404).json({
          success: false,
          message: 'Active package not found for the selected service.',
        })
      }
    }

    // Validate display order
    const order = Number(displayOrder)

    if (!Number.isInteger(order) || order < 1) {
      return response.status(400).json({
        success: false,
        message: 'Display order must be a positive integer.',
      })
    }

    // Validate media type
    if (!['image', 'video'].includes(mediaType)) {
      return response.status(400).json({
        success: false,
        message: 'Media type must be image or video.',
      })
    }

    let mediaData

    // Cloudinary media
    if (provider === 'cloudinary') {
      if (!file) {
        return response.status(400).json({
          success: false,
          message: 'Please upload a media file.',
        })
      }

      // Validate uploaded file type
      if (mediaType === 'image' && !file.mimetype.startsWith('image/')) {
        return response.status(400).json({
          success: false,
          message: 'Please upload a valid image file.',
        })
      }

      if (mediaType === 'video' && !file.mimetype.startsWith('video/')) {
        return response.status(400).json({
          success: false,
          message: 'Please upload a valid video file.',
        })
      }

      uploadResult = await uploadToCloudinary(file.buffer, 'gallery')

      mediaData = {
        type: mediaType,
        provider: 'cloudinary',
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      }
    }

    // YouTube media
    else if (provider === 'youtube') {
      if (mediaType !== 'video') {
        return response.status(400).json({
          success: false,
          message: 'YouTube supports video only.',
        })
      }

      if (file) {
        return response.status(400).json({
          success: false,
          message: 'Do not upload a file for YouTube videos.',
        })
      }

      if (!url || !/^https?:\/\/.+/i.test(url)) {
        return response.status(400).json({
          success: false,
          message: 'Please provide a valid YouTube video URL.',
        })
      }

      mediaData = {
        type: 'video',
        provider: 'youtube',
        url: url.trim(),
      }
    } else {
      return response.status(400).json({
        success: false,
        message: 'Provider must be cloudinary or youtube.',
      })
    }

    if (isFeatured !== undefined && !['true', 'false'].includes(isFeatured)) {
      return response.status(400).json({
        success: false,
        message: 'isFeatured must be true or false.',
      })
    }

    // Create Gallery item
    const newGalleryItem = await Gallery.create({
      serviceId,
      ...(packageId && { packageId }),
      categoryId,
      title,
      description,
      media: mediaData,
      altText,
      displayOrder: order,
      ...(isFeatured !== undefined && {
        isFeatured: isFeatured === 'true',
      }),
    })

    return response.status(201).json({
      success: true,
      message: 'Gallery item created successfully.',
      data: newGalleryItem,
    })
  } catch (error) {
    logger.error('Failed to create gallery item.', error)

    // Clean up Cloudinary upload if database creation failed
    if (uploadResult?.public_id) {
      try {
        await deleteFromCloudinary(uploadResult.public_id)
      } catch (cleanupError) {
        logger.error('Failed to clean up uploaded gallery media.', cleanupError)
      }
    }

    return response.status(500).json({
      success: false,
      message: 'Failed to create gallery item.',
    })
  }
})

// PATCH Route
galleryRouter.patch(
  '/:id',
  upload.single('media'),
  async (request, response) => {
    let newUploadResult
    let isDatabaseSaved = false

    try {
      const { id } = request.params

      if (!mongoose.isValidObjectId(id)) {
        return response.status(400).json({
          success: false,
          message: 'Invalid gallery ID.',
        })
      }

      const existingGallery = await Gallery.findOne({
        _id: id,
        isDeleted: false,
      })

      if (!existingGallery) {
        return response.status(404).json({
          success: false,
          message: 'Gallery item not found.',
        })
      }

      const {
        serviceId,
        packageId,
        categoryId,
        title,
        description,
        mediaType,
        provider,
        url,
        altText,
        displayOrder,
        isFeatured,
        isActive,
      } = request.body

      const file = request.file

      // Validate Service
      const selectedServiceId = serviceId ?? existingGallery.serviceId

      if (!mongoose.isValidObjectId(selectedServiceId)) {
        return response.status(400).json({
          success: false,
          message: 'Invalid service ID.',
        })
      }

      if (serviceId !== undefined || packageId !== undefined) {
        const existingService = await Service.findOne({
          _id: selectedServiceId,
          isActive: true,
          isDeleted: false,
        })

        if (!existingService) {
          return response.status(404).json({
            success: false,
            message: 'Active service not found.',
          })
        }
      }

      // Validate Category
      if (categoryId !== undefined) {
        if (!mongoose.isValidObjectId(categoryId)) {
          return response.status(400).json({
            success: false,
            message: 'Invalid category ID.',
          })
        }

        const existingCategory = await GalleryCategory.findOne({
          _id: categoryId,
          isActive: true,
          isDeleted: false,
        })

        if (!existingCategory) {
          return response.status(404).json({
            success: false,
            message: 'Active gallery category not found.',
          })
        }

        existingGallery.categoryId = categoryId
      }

      // Validate optional Package
      if (packageId !== undefined) {
        if (packageId === '') {
          existingGallery.packageId = undefined
        } else {
          if (!mongoose.isValidObjectId(packageId)) {
            return response.status(400).json({
              success: false,
              message: 'Invalid package ID.',
            })
          }

          const existingPackage = await Package.findOne({
            _id: packageId,
            serviceId: selectedServiceId,
            isActive: true,
            isDeleted: false,
          })

          if (!existingPackage) {
            return response.status(404).json({
              success: false,
              message: 'Active package not found for the selected service.',
            })
          }

          existingGallery.packageId = packageId
        }
      } else if (serviceId !== undefined) {
        // Prevent package from belonging to a different service
        if (existingGallery.packageId) {
          const packageBelongsToService = await Package.findOne({
            _id: existingGallery.packageId,
            serviceId: selectedServiceId,
            isActive: true,
            isDeleted: false,
          })

          if (!packageBelongsToService) {
            return response.status(400).json({
              success: false,
              message: 'Selected service does not match the existing package.',
            })
          }
        }
      }

      if (serviceId !== undefined) {
        existingGallery.serviceId = selectedServiceId
      }

      // Update text fields
      if (title !== undefined) {
        existingGallery.title = title
      }

      if (description !== undefined) {
        existingGallery.description = description
      }

      if (altText !== undefined) {
        existingGallery.altText = altText
      }

      // Update display order
      if (displayOrder !== undefined) {
        const order = Number(displayOrder)

        if (!Number.isInteger(order) || order < 1) {
          return response.status(400).json({
            success: false,
            message: 'Display order must be a positive integer.',
          })
        }

        existingGallery.displayOrder = order
      }

      // Update Boolean fields
      if (isFeatured !== undefined) {
        if (!['true', 'false'].includes(isFeatured)) {
          return response.status(400).json({
            success: false,
            message: 'isFeatured must be true or false.',
          })
        }

        existingGallery.isFeatured = isFeatured === 'true'
      }

      if (isActive !== undefined) {
        if (!['true', 'false'].includes(isActive)) {
          return response.status(400).json({
            success: false,
            message: 'isActive must be true or false.',
          })
        }

        existingGallery.isActive = isActive === 'true'
      }

      // Update media only when media-related fields are provided
      const mediaUpdateRequested =
        mediaType !== undefined ||
        provider !== undefined ||
        url !== undefined ||
        file !== undefined

      if (mediaUpdateRequested) {
        const selectedMediaType = mediaType || existingGallery.media.type
        const selectedProvider = provider || existingGallery.media.provider

        if (!['image', 'video'].includes(selectedMediaType)) {
          return response.status(400).json({
            success: false,
            message: 'Media type must be image or video.',
          })
        }

        let newMediaData

        // Cloudinary media
        if (selectedProvider === 'cloudinary') {
          if (!file) {
            return response.status(400).json({
              success: false,
              message: 'Please upload a media file for Cloudinary.',
            })
          }

          if (
            selectedMediaType === 'image' &&
            !file.mimetype.startsWith('image/')
          ) {
            return response.status(400).json({
              success: false,
              message: 'Please upload a valid image file.',
            })
          }

          if (
            selectedMediaType === 'video' &&
            !file.mimetype.startsWith('video/')
          ) {
            return response.status(400).json({
              success: false,
              message: 'Please upload a valid video file.',
            })
          }

          newUploadResult = await uploadToCloudinary(file.buffer, 'gallery')

          newMediaData = {
            type: selectedMediaType,
            provider: 'cloudinary',
            url: newUploadResult.secure_url,
            publicId: newUploadResult.public_id,
          }
        }

        // YouTube media
        else if (selectedProvider === 'youtube') {
          if (selectedMediaType !== 'video') {
            return response.status(400).json({
              success: false,
              message: 'YouTube supports video only.',
            })
          }

          if (file) {
            return response.status(400).json({
              success: false,
              message: 'Do not upload a file for YouTube videos, Please upload valid YouTube URL.',
            })
          }

          if (!url || !/^https?:\/\/.+/i.test(url)) {
            return response.status(400).json({
              success: false,
              message: 'Please provide a valid YouTube video URL.',
            })
          }

          newMediaData = {
            type: 'video',
            provider: 'youtube',
            url: url.trim(),
          }
        } else {
          return response.status(400).json({
            success: false,
            message: 'Provider must be cloudinary or youtube.',
          })
        }

        // Save old Cloudinary public ID for cleanup after database save
        const oldPublicId =
          existingGallery.media.provider === 'cloudinary'
            ? existingGallery.media.publicId
            : null

        existingGallery.media = newMediaData

        await existingGallery.save()
        isDatabaseSaved = true

        // Delete old Cloudinary media after successful database update
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId)
          } catch (cleanupError) {
            logger.error('Failed to delete old gallery media.', cleanupError)
          }
        }

        return response.status(200).json({
          success: true,
          message: 'Gallery item updated successfully.',
          data: existingGallery,
        })
      }

      // Save normal field updates
      await existingGallery.save()
      isDatabaseSaved = true

      return response.status(200).json({
        success: true,
        message: 'Gallery item updated successfully.',
        data: existingGallery,
      })
    } catch (error) {
      logger.error('Failed to update gallery item.', error)

      // Clean up newly uploaded media if database update failed
      if (!isDatabaseSaved && newUploadResult?.public_id) {
        try {
          await deleteFromCloudinary(newUploadResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to clean up new gallery media.', cleanupError)
        }
      }

      return response.status(500).json({
        success: false,
        message: 'Failed to update gallery item.',
      })
    }
  },
)


// DELETE Route
galleryRouter.delete('/:id', async (request, response) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({
        success: false,
        message: 'Invalid gallery ID.',
      })
    }

    const existingGallery = await Gallery.findOne({
      _id: request.params.id,
      isDeleted: false,
    })

    if (!existingGallery) {
      return response.status(404).json({
        success: false,
        message: 'Gallery item not found.',
      })
    }

    existingGallery.isDeleted = true
    existingGallery.deletedAt = new Date()

    await existingGallery.save()

    return response.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully.',
    })
  } catch (error) {
    logger.error('Failed to delete gallery item.', error)

    return response.status(500).json({
      success: false,
      message: 'Failed to delete gallery item.',
    })
  }
})


module.exports = galleryRouter
