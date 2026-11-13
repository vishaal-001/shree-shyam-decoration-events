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

      const package = await Package.create({
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
        data: package,
      })
    } catch (error) {}
  },
)
