const websiteSettingsRouter = require('express').Router()
const WebsiteSettings = require('../models/WebsiteSettings')
const upload = require('../middleware/upload')
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../utils/cloudinary')
const logger = require('../utils/logger')
const parseJSON = require('../utils/parseJson')

// GET Route
websiteSettingsRouter.get('/', async (request, response) => {
  const existingSettings = await WebsiteSettings.findOne()
  if (!existingSettings) {
    return response.status(404).json({
      success: false,
      message: 'Website settings not found.',
    })
  }

  response.status(200).json({
    success: true,
    data: existingSettings,
  })
})

//  POST Route
websiteSettingsRouter.post(
  '/',
  upload.fields([
    {
      name: 'logo',
      maxCount: 1,
    },
    {
      name: 'favicon',
      maxCount: 1,
    },
  ]),
  async (request, response) => {
    let logoResult
    let faviconResult
    try {
      const existingSettings = await WebsiteSettings.findOne()

      if (existingSettings) {
        return response.status(409).json({
          success: false,
          message: 'Website settings already exist.',
        })
      }

      const business = parseJSON(request.body.business, 'business')
      const contact = parseJSON(request.body.contact, 'contact')
      const address = parseJSON(request.body.address, 'address')
      const shop = parseJSON(request.body.shop, 'shop')
      const socialLinks = parseJSON(request.body.socialLinks, 'socialLinks')
      const seo = parseJSON(request.body.seo, 'seo')
      const footer = parseJSON(request.body.footer, 'footer')

      const logoFile = request.files?.logo?.[0]
      if (!logoFile) {
        return response.status(400).json({
          success: false,
          message: 'Logo image is required.',
        })
      }
      logoResult = await uploadToCloudinary(logoFile.buffer, 'ssde/logo')
      logger.info('LogoResult', logoResult)

      const faviconFile = request.files?.favicon?.[0]

      if (faviconFile) {
        faviconResult = await uploadToCloudinary(
          faviconFile.buffer,
          'ssde/favicon',
        )
        logger.info('FaviconResult', faviconResult)
      }

      const settings = await WebsiteSettings.create({
        business: {
          ...business,
          logo: {
            url: logoResult.secure_url,
            publicId: logoResult.public_id,
          },
          ...(faviconResult && {
            favicon: {
              url: faviconResult.secure_url,
              publicId: faviconResult.public_id,
            },
          }),
        },
        contact,
        address,
        shop,
        socialLinks,
        seo,
        footer,
      })
      response.status(201).json({
        success: true,
        message: 'Website settings created successfully.',
        data: settings,
      })
    } catch (error) {
      logger.error('Failed to create website settings.', error)

      if (logoResult?.public_id) {
        try {
          await deleteFromCloudinary(logoResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to delete logo from cloudinary', cleanupError)
        }
      }

      if (faviconResult?.public_id) {
        try {
          await deleteFromCloudinary(faviconResult.public_id)
        } catch (cleanupError) {
          logger.error('Failed to delete favicon from cloudinary', cleanupError)
        }
      }

      return response.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode
          ? error.message
          : 'Failed to create website settings.',
      })
    }
  },
)

// PATCH Route or Route for update existingSettings
websiteSettingsRouter.patch(
  '/',
  upload.fields([
    {
      name: 'logo',
      maxCount: 1,
    },
    {
      name: 'favicon',
      maxCount: 1,
    },
  ]),
  async (request, response) => {
    let newLogoResult
    let oldLogoPublicId
    let newFaviconResult
    let oldFaviconPublicId

    try {
      const existingSettings = await WebsiteSettings.findOne()

      if (!existingSettings) {
        return response.status(404).json({
          success: false,
          message: 'Website settings not found.',
        })
      }

      // Business update
      if (request.body.business) {
        const business = parseJSON(request.body.business, 'business')

        delete business.logo
        delete business.favicon

        existingSettings.business = {
          ...existingSettings.business,
          ...business,
        }
      }

      // Logo update handling
      const logoFile = request.files?.logo?.[0]

      if (logoFile) {
        oldLogoPublicId = existingSettings.business.logo.publicId
        newLogoResult = await uploadToCloudinary(logoFile.buffer, 'ssde/logo')
      }

      if (newLogoResult) {
        existingSettings.business.logo = {
          url: newLogoResult.secure_url,
          publicId: newLogoResult.public_id,
        }
      }

      //Favicon update
      const faviconFile = request.files?.favicon?.[0]
      if (faviconFile) {
        oldFaviconPublicId = existingSettings.business.favicon?.publicId
        newFaviconResult = await uploadToCloudinary(
          faviconFile.buffer,
          'ssde/favicon',
        )

        if (newFaviconResult) {
          existingSettings.business.favicon = {
            url: newFaviconResult.secure_url,
            publicId: newFaviconResult.public_id,
          }
        }
      }

      // Contact update
      if (request.body.contact) {
        const contact = parseJSON(request.body.contact, 'contact')

        existingSettings.contact = {
          ...existingSettings.contact,
          ...contact,
        }
      }

      // Address update
      if (request.body.address) {
        const address = parseJSON(request.body.address, 'address')

        existingSettings.address = {
          ...existingSettings.address,
          ...address,
        }
      }

      // Shop update
      if (request.body.shop) {
        const shop = parseJSON(request.body.shop, 'shop')

        existingSettings.shop = {
          ...existingSettings.shop,
          ...shop,
        }
      }

      // SocialLinks update
      if (request.body.socialLinks) {
        const socialLinks = parseJSON(request.body.socialLinks, 'socialLinks')

        existingSettings.socialLinks = {
          ...existingSettings.socialLinks,
          ...socialLinks,
        }
      }

      // SEO update
      if (request.body.seo) {
        const seo = parseJSON(request.body.seo, 'seo')

        existingSettings.seo = {
          ...existingSettings.seo,
          ...seo,
        }
      }

      // Footer update
      if (request.body.footer) {
        const footer = parseJSON(request.body.footer, 'footer')

        existingSettings.footer = {
          ...existingSettings.footer,
          ...footer,
        }
      }

      await existingSettings.save()

      // Delete old logo from cloudinary
      if (newLogoResult && oldLogoPublicId) {
        try {
          await deleteFromCloudinary(oldLogoPublicId)
        } catch (cleanupError) {
          logger.error(
            'Failed to delete old logo from cloudinary',
            cleanupError,
          )
        }
      }

      //Delete old favicon from cloudinary
      if (newFaviconResult && oldFaviconPublicId) {
        try {
          await deleteFromCloudinary(oldFaviconPublicId)
        } catch (cleanupError) {
          logger.error(
            'Failed to delete old favicon from cloudinary',
            cleanupError,
          )
        }
      }

      response.status(200).json({
        success: true,
        message: 'Website settings updated successfully.',
        data: existingSettings,
      })
    } catch (error) {
      logger.error('Failed to update website settings.', error)

      //Deletion of new logo
      if (newLogoResult?.public_id) {
        try {
          await deleteFromCloudinary(newLogoResult.public_id)
        } catch (cleanupError) {
          logger.error(
            'Failed to delete new logo from cloudinary',
            cleanupError,
          )
        }
      }

      //Deletion of new favicon
      if (newFaviconResult?.public_id) {
        try {
          await deleteFromCloudinary(newFaviconResult.public_id)
        } catch (cleanupError) {
          logger.error(
            'Failed to delete new favicon from cloudinary',
            cleanupError,
          )
        }
      }

      return response.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode
          ? error.message
          : 'Failed to update website settings.',
      })
    }
  },
)

websiteSettingsRouter.delete('/', async (request, response) => {
  response.json({ message: 'under improvement' })
})

module.exports = websiteSettingsRouter
