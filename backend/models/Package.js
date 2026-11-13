const mongoose = require('mongoose')

const packageSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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

    startingPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: 'Starting price must be a finite number.',
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
packageSchema.pre('validate', function () {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
})

packageSchema.index(
  { serviceId: 1, slug: 1 },
  {
    unique: true,
  },
)

module.exports = mongoose.model('Package', packageSchema)
