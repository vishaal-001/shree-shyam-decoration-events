const { Readable } = require('stream')
const cloudinary = require('cloudinary').v2

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      },
    )
    stream.pipe(uploadStream)
  })
}

const deleteFromCloudinary = (publicId) => {
    return ( new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if(error){
                reject(error)
            }else{
                resolve(result)
            }
        })
    }))
}

module.exports = {uploadToCloudinary, deleteFromCloudinary}
