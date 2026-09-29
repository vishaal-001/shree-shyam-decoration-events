const mongoose = require('mongoose')

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100,
      unique: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minLength: 50,
      maxLength: 5000,
    },

    features: {
      type: [
        {
          type: String,
          required: true,
          trim: true,
          minLength: 3,
          maxLength: 100,
        },
      ],
      required: true,
      validate: {
        validator: (value) => value.length >= 1 && value.length <= 20,
        message: 'Features must contain at least 1 and not more than 20 items.',
      },
    },

    thumbnail: {
      url: {
        type: String,
        required: true,
        trim: true,
      },
      publicId: {
        type: String,
        required: true,
        trim: true,
      },
    },

    coverImage: {
      url: {
        type: String,
        required: true,
        trim: true,
      },
      publicId: {
        type: String,
        required: true,
        trim: true,
      },
    },

    metaTitle: {
      type: String,
      trim: true,
      maxLength: 60,
    },

    metaDescription: {
      type: String,
      trim: true,
      maxLength: 160,
    },

    displayOrder: {
      type: Number,
      required: true,
      min: 1,
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

//slug generation
serviceSchema.pre('validate', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  next()
})

module.exports = mongoose.model('Service', serviceSchema)
