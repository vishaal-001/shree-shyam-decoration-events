require('dotenv').config()

const PORT = process.env.PORT
const MONGODB_URI = process.env.MONGODB_URI
const CLOUDINARY_CLOUD_NAME= process.env.CLOUD_NAME
const CLOUDINARY_API_KEY= process.env.CLOUD_API_KEY
const CLOUDINARY_API_SECRET= process.env.CLOUD_API_SECRET
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY
const JWT_SECRET = process.env.JWT_SECRET
console.log('from config', ADMIN_SECRET_KEY)
module.exports = {
  PORT,
  MONGODB_URI,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  ADMIN_SECRET_KEY,
  JWT_SECRET
}
