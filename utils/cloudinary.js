const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadImage = async (file, folder = "aahaar") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "auto",
      transformation: [{ width: 1000, height: 1000, crop: "limit" }, { quality: "auto" }, { fetch_format: "auto" }],
    })

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return { success: true, result }
  } catch (error) {
    console.error("Cloudinary delete error:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  cloudinary,
}
