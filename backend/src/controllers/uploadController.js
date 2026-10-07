const { uploadBufferToCloudinary } = require('../utils/cloudinary');

// POST /api/v1/upload — single image (multipart field name "image").
// Used wherever a single image is picked from the device (logo, a product's
// main image one at a time, etc). Returns the Cloudinary secure_url.
exports.uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });

  try {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'growthkarts/products');
    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    res.status(502).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

// POST /api/v1/upload/multiple — several images at once (multipart field
// name "images"). Used for a product's image gallery / variant images.
exports.uploadImages = async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No image files provided' });

  try {
    const results = await Promise.all(
      req.files.map((file) => uploadBufferToCloudinary(file.buffer, 'growthkarts/products'))
    );
    res.json({ success: true, urls: results.map((r) => r.secure_url) });
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    res.status(502).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

// POST /api/v1/upload/media — seller storefront hero image or video.
exports.uploadMedia = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No media file provided' });

  try {
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const result = await uploadBufferToCloudinary(req.file.buffer, 'growthkarts/storefront', resourceType);
    res.json({ success: true, url: result.secure_url, type: resourceType });
  } catch (error) {
    console.error('Cloudinary media upload failed:', error);
    const message = error?.http_code === 400 || /too large/i.test(error?.message || '')
      ? error.message
      : 'Media upload failed. Please try again.';
    res.status(502).json({ success: false, message });
  }
};

// POST /api/v1/upload/review-media — customer review photos and videos in one
// call (multipart field name "media"). Returns the URLs split by type so the
// review form can keep them apart.
const MAX_REVIEW_PHOTO_BYTES = 8 * 1024 * 1024;

exports.uploadReviewMedia = async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files provided' });

  const tooBig = req.files.find((f) => f.mimetype.startsWith('image/') && f.size > MAX_REVIEW_PHOTO_BYTES);
  if (tooBig) return res.status(413).json({ success: false, message: 'Photos must be 8MB or smaller' });

  try {
    const results = await Promise.all(
      req.files.map(async (file) => {
        const type = file.mimetype.startsWith('video/') ? 'video' : 'image';
        const result = await uploadBufferToCloudinary(file.buffer, 'growthkarts/reviews', type);
        return { type, url: result.secure_url };
      })
    );
    res.json({
      success: true,
      images: results.filter((r) => r.type === 'image').map((r) => r.url),
      videos: results.filter((r) => r.type === 'video').map((r) => r.url),
    });
  } catch (error) {
    console.error('Cloudinary review media upload failed:', error);
    res.status(502).json({ success: false, message: 'Upload failed. Please try again.' });
  }
};
