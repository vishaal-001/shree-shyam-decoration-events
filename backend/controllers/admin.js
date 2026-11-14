const adminRouter = require('express').Router()
const Admin = require('../models/Admin')
const bcrypt = require('bcryptjs')
const logger = require('../utils/logger')

//POST Route
adminRouter.post('/setup', async (request, response) => {
  const setupKey = request.headers['x-admin-setup-key']

  if (
    !process.env.ADMIN_SETUP_KEY ||
    setupKey !== process.env.ADMIN_SETUP_KEY
  ) {
    return response.status(401).json({
      success: false,
      message: 'Unauthorized setup request.',
    })
  }

  const existingAdmin = await Admin.findOne()

  if (existingAdmin) {
    return response.status(403).json({
      success: false,
      message: 'Admin account has already been created.',
    })
  }

  const { name, email, password } = request.body

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return response.status(400).json({
      success: false,
      message: 'Name, email and password are required.',
    })
  }

  if (name.trim().length < 3 || name.trim().length > 60) {
    return response.status(400).json({
      success: false,
      message: 'Name must be between 3 and 60 characters.',
    })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  if (!emailRegex.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    })
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9\s]/.test(password) ||
    /\s/.test(password)
  ) {
    return response.status(400).json({
      success: false,
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number and special character. Spaces are not allowed.',
    })
  }
})

module.exports = adminRouter
