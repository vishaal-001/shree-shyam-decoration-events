const mongoose = require('mongoose')

const gallerySchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GalleryCategory',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxLength: 1000,
    },

    media: {
      type: {
        type: String,
        required: true,
        enum: ['image', 'video'],
      },

      provider: {
        type: String,
        required: true,
        enum: ['cloudinary', 'youtube'],
      },

      url: {
        type: String,
        required: true,
        trim: true,
      },

      publicId: {
        type: String,
        trim: true,
      },
    },

    altText: {
      type: String,
      trim: true,
    },

    displayOrder: {
      type: Number,
      required: true,
      min: 1,
    },

    isFeatured: {
      type: Boolean,
      required: true,
      default: false,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

//validate combinations of media
gallerySchema.pre('validate', function () {
  const media = this.media

  if (!media) {
    this.invalidate('media', 'Media details are required.')
    return
  }

  if (media.type === 'image' && media.provider !== 'cloudinary') {
    this.invalidate('media.provider', 'Images can only use Cloudinary.')
  }

  if (media.provider === 'cloudinary' && !media.publicId) {
    this.invalidate('media.publicId', 'Cloudinary media must have a publicId.')
  }

  if (media.provider === 'youtube' && media.type !== 'video') {
    this.invalidate('media.provider', 'YouTube supports video only.')
  }

  if (
    media.provider === 'youtube' &&
    !/^https?:\/\/.+/i.test(media.url || '')
  ) {
    this.invalidate('media.url', 'YouTube videos must have a valid URL.')
  }
})

module.exports = mongoose.model('Gallery', gallerySchema)
