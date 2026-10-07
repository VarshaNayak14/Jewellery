const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadImage, uploadImages, uploadMedia, uploadReviewMedia } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

// In-memory storage — the buffer goes straight to Cloudinary, never touches disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only image and video files are allowed'));
    }
    cb(null, true);
  },
});

// Review photos (any size up to the controller's 8MB check) and short videos.
// 50MB per file, at most 7 files (5 photos + 2 videos) per request.
const reviewMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 7 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return cb(Object.assign(new Error('Only photos and videos are allowed'), { statusCode: 400 }));
    }
    cb(null, true);
  },
});

// Admin (product catalog), Seller (their own listings) and Courier (their
// own profile photo) all upload images from their device — any other role
// is blocked.
const uploaderOnly = (req, res, next) => {
  if (!['user', 'admin', 'superadmin', 'seller', 'courier'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized to upload images' });
  }
  next();
};

router.post('/', protect, uploaderOnly, upload.single('image'), uploadImage);
router.post('/multiple', protect, uploaderOnly, upload.array('images', 10), uploadImages);
router.post('/media', protect, uploaderOnly, mediaUpload.single('media'), uploadMedia);
router.post('/review-media', protect, uploaderOnly, reviewMediaUpload.array('media', 7), uploadReviewMedia);

module.exports = router;
