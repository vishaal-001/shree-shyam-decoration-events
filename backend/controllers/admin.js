const adminRouter = require('express').Router()
const Admin = require('../models/Admin')
const bcrypt = require('bcryptjs')
const logger = require('../utils/logger')
const { ADMIN_SECRET_KEY, JWT_SECRET } = require('../utils/config')
const jwt = require('jsonwebtoken')

//POST Route
// adminRouter.post('/setup', async (request, response) => {
//   try {
//     const setupKey = request.headers['x-admin-setup-key']
//     if (!ADMIN_SECRET_KEY || setupKey !== ADMIN_SECRET_KEY) {
//       return response.status(401).json({
//         success: false,
//         message: 'Unauthorized setup request.',
//       })
//     }

//     const existingAdmin = await Admin.findOne()

//     if (existingAdmin) {
//       return response.status(403).json({
//         success: false,
//         message: 'Admin account has already been created.',
//       })
//     }

//     const { name, email, password } = request.body

//     if (
//       typeof name !== 'string' ||
//       typeof email !== 'string' ||
//       typeof password !== 'string'
//     ) {
//       return response.status(400).json({
//         success: false,
//         message: 'Name, email and password are required.',
//       })
//     }

//     if (name.trim().length < 3 || name.trim().length > 60) {
//       return response.status(400).json({
//         success: false,
//         message: 'Name must be between 3 and 60 characters.',
//       })
//     }

//     const normalizedEmail = email.trim().toLowerCase()

//     const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

//     if (!emailRegex.test(normalizedEmail)) {
//       return response.status(400).json({
//         success: false,
//         message: 'Please provide a valid email address.',
//       })
//     }

//     if (
//       password.length < 8 ||
//       Buffer.byteLength(password, 'utf8') > 72 ||
//       !/[a-z]/.test(password) ||
//       !/[A-Z]/.test(password) ||
//       !/[0-9]/.test(password) ||
//       !/[^a-zA-Z0-9\s]/.test(password) ||
//       /\s/.test(password)
//     ) {
//       return response.status(400).json({
//         success: false,
//         message:
//           'Password must be at least 8 characters and include uppercase, lowercase, number and special character. Spaces are not allowed.',
//       })
//     }

//     const hashedPassword = await bcrypt.hash(password, 12)

//     const newAdmin = await Admin.create({
//       name: name.trim(),
//       email: normalizedEmail,
//       password: hashedPassword,
//     })

//     return response.status(201).json({
//       success: true,
//       message: 'Admin has been saved successfully.',
//       admin: {
//         name: newAdmin.name,
//         email: newAdmin.email,
//       },
//     })
//   } catch (error) {
//     logger.error('Admin has been failed to save.', error)

//     return response.status(500).json({
//       success: false,
//       message: 'Admin has been failed to save.',
//     })
//   }
// })

//Login Route
adminRouter.post('/login', async (request, response) => {
  try {
    const { email, password } = request.body
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return response.status(400).json({
        success: false,
        message: 'Please enter required credentials.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const admin = await Admin.findOne({ email: normalizedEmail })

    if (!admin) {
      return response.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      })
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password)
    if (!isPasswordValid) {
      return response.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      })
    }

    const payload = {
      id: admin._id,
    }

    const options = {
      expiresIn: 60 * 60,
    }

    const token = jwt.sign(payload, JWT_SECRET, options)

    return response.status(200).json({
      success: true,
      message: 'Logged in.',
      token: token,
      admin: {
        name: admin.name,
        email: admin.email,
      },
    })
  } catch (error) {
    logger.error('Login has been failed.', error)

    return response.status(500).json({
      success: false,
      message: 'Login has been failed.',
    })
  }
})

module.exports = adminRouter
