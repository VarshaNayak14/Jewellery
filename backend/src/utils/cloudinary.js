const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Uploads a single in-memory file buffer (from multer's memoryStorage) to
// Cloudinary and resolves with the secure_url. `folder` groups uploads by
// what they're for (e.g. "growthkarts/products") so the Cloudinary media
// library stays organized.
//
// Use the SDK's supported `upload_stream` path for both images and videos.
// In newer Cloudinary Node versions, `upload_large_stream` is not available,
// so the safer compatibility choice is the standard stream upload API.
const uploadBufferToCloudinary = (buffer, folder, resourceType = 'image') =>
  new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
      ...(resourceType === 'video' ? { chunk_size: 6 * 1024 * 1024 } : {}),
    };
    const callback = (error, result) => (error ? reject(error) : resolve(result));
    const stream = cloudinary.uploader.upload_stream(options, callback);
    stream.end(buffer);
  });

module.exports = { cloudinary, uploadBufferToCloudinary };
