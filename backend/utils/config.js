require('dotenv').config()

const PORT = process.env.PORT
const MONGODB_URI = process.env.MONGODB_URI
const CLOUDINARY_CLOUD_NAME= process.env.CLOUD_NAME
const CLOUDINARY_API_KEY= process.env.CLOUD_API_KEY
const CLOUDINARY_API_SECRET= process.env.CLOUD_API_SECRET

module.exports = {
  PORT,
  MONGODB_URI,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
}
