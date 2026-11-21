const galleryCategoryRouter = require('express').Router()
const GalleryCategory = require('../models/GalleryCategory')
const mongoose = require('mongoose')
const logger = require('../utils/logger')
const authenticateAdmin = require('../middleware/auth')

// GET Route
galleryCategoryRouter.get('/', async (request, response) => {
  try {
    const allCategories = await GalleryCategory.find({
      isActive: true,
      isDeleted: false,
    }).sort({ displayOrder: 1 })

    return response.status(200).json({
      success: true,
      message: 'Gallery categories fetched successfully.',
      data: allCategories,
    })
  } catch (error) {
    logger.error('Failed to fetch gallery categories.', error)

    return response.status(500).json({
      success: false,
      message: 'Failed to fetch gallery categories.',
    })
  }
})

// POST Route
galleryCategoryRouter.post(
  '/',
  authenticateAdmin,
  async (request, response) => {
    try {
      const { name, description, displayOrder } = request.body

      const order = Number(displayOrder)

      if (!Number.isInteger(order) || order < 1) {
        return response.status(400).json({
          success: false,
          message: 'Display order must be a positive integer.',
        })
      }

      const newCategory = await GalleryCategory.create({
        name,
        description,
        displayOrder: order,
      })

      return response.status(201).json({
        success: true,
        message: 'Gallery category created successfully.',
        data: newCategory,
      })
    } catch (error) {
      logger.error('Failed to create gallery category.', error)

      return response.status(500).json({
        success: false,
        message: 'Failed to create gallery category.',
      })
    }
  },
)

// PATCH Route
galleryCategoryRouter.patch(
  '/:id',
  authenticateAdmin,
  async (request, response) => {
    try {
      if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({
          success: false,
          message: 'Invalid category ID.',
        })
      }

      const existingCategory = await GalleryCategory.findOne({
        _id: request.params.id,
        isDeleted: false,
      })

      if (!existingCategory) {
        return response.status(404).json({
          success: false,
          message: 'Gallery category not found.',
        })
      }

      const { name, description, displayOrder, isActive } = request.body

      if (name !== undefined) existingCategory.name = name

      if (description !== undefined) {
        existingCategory.description = description
      }

      if (displayOrder !== undefined) {
        const order = Number(displayOrder)

        if (!Number.isInteger(order) || order < 1) {
          return response.status(400).json({
            success: false,
            message: 'Display order must be a positive integer.',
          })
        }

        existingCategory.displayOrder = order
      }

      if (isActive !== undefined) {
        if (!['true', 'false'].includes(isActive)) {
          return response.status(400).json({
            success: false,
            message: 'isActive must be true or false.',
          })
        }

        existingCategory.isActive = isActive === 'true'
      }

      await existingCategory.save()

      return response.status(200).json({
        success: true,
        message: 'Gallery category updated successfully.',
        data: existingCategory,
      })
    } catch (error) {
      logger.error('Failed to update gallery category.', error)

      return response.status(500).json({
        success: false,
        message: 'Failed to update gallery category.',
      })
    }
  },
)

// DELETE Route
galleryCategoryRouter.delete(
  '/:id',
  authenticateAdmin,
  async (request, response) => {
    try {
      if (!mongoose.isValidObjectId(request.params.id)) {
        return response.status(400).json({
          success: false,
          message: 'Invalid category ID.',
        })
      }

      const existingCategory = await GalleryCategory.findOne({
        _id: request.params.id,
        isDeleted: false,
      })

      if (!existingCategory) {
        return response.status(404).json({
          success: false,
          message: 'Gallery category not found.',
        })
      }

      existingCategory.isDeleted = true
      existingCategory.deletedAt = new Date()

      await existingCategory.save()

      return response.status(200).json({
        success: true,
        message: 'Gallery category deleted successfully.',
      })
    } catch (error) {
      logger.error('Failed to delete gallery category.', error)

      return response.status(500).json({
        success: false,
        message: 'Failed to delete gallery category.',
      })
    }
  },
)

module.exports = galleryCategoryRouter
