const mongoose = require('mongoose')

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\d{10}$/
const pincodeRegex = /^\d{6}$/

const websiteSettingsSchema = new mongoose.Schema(
  {
    business: {
      name: {
        type: String,
        trim: true,
        required: true,
        minLength: 3,
        maxLength: 100,
      },
      tagline: { type: String, trim: true, maxLength: 150 },
      description: {
        type: String,
        trim: true,
        maxLength: 1000,
      },
      logo: {
        url: {
          type: String,
          trim: true,
          required: true,
        },
        publicId:{
          type: String,
          trim: true,
          required: true
        }
      },
      favicon: {
        url: {
          type: String,
          trim: true,
        }, 
        publicId:{
          type: String,
          trim: true
        }
      },
    },
    contact: {
      phone: {
        type: String,
        trim: true,
        match: [phoneRegex, 'Please provide a valid 10-digit phone number.'],
        required: true,
      },
      whatsapp: {
        type: String,
        trim: true,
        match: [phoneRegex, 'Please provide a valid 10-digit phone number.'],
      },
      isWhatsappSameAsPhone: {
        type: Boolean,
        default: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [emailRegex, 'Please provide a valid email address.'],
      },
    },
    address: {
      line1: {
        type: String,
        required: true,
        maxLength: 100,
        minLength: 5,
        trim: true,
      },
      line2: {
        type: String,
        maxLength: 100,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        maxLength: 50,
        minLength: 2,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        maxLength: 50,
        minLength: 2,
        trim: true,
      },
      pincode: {
        type: String,
        match: [pincodeRegex, 'Please provide a valid pincode number'],
        trim: true,
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
      googleMapsUrl: {
        type: String,
        trim: true,
      },
    },
    shop: {
      openingTime: {
        type: String,
        required: true,
        trim: true,
      },
      closingTime: {
        type: String,
        required: true,
        trim: true,
      },
      weeklyOff: [
        {
          type: String,
          trim: true,
        },
      ],
      isShopOpen: {
        type: Boolean,
        default: true,
      },
      shopStatusMessage: {
        type: String,
        maxLength: 300,
        trim: true,
      },
    },
    socialLinks: {
      instagram: {
        type: String,
        trim: true,
      },
      facebook: {
        type: String,
        trim: true,
      },
      youtube: {
        type: String,
        trim: true,
      },
    },
    seo: {
      metaTitle: {
        type: String,
        maxLength: 60,
        trim: true,
      },
      metaDescription: {
        type: String,
        maxLength: 160,
        trim: true,
      },
    },
    footer: {
      copyrightText: {
        type: String,
        maxLength: 150,
        trim: true,
      },
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema)
