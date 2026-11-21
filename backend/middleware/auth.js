const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../utils/config')

const authenticateAdmin = (request, response, next) => {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return response.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
    }

    const [scheme, token] = authHeader.trim().split(/\s+/)

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return response.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      })
    }

    const decodedToken = jwt.verify(token, JWT_SECRET)

    request.adminId = decodedToken.id

    next()


  } catch (error) {
    return response.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      })
  }
}

module.exports = authenticateAdmin