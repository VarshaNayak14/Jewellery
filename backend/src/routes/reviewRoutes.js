const express = require('express');
const router = express.Router();
const {
  createReview, getProductReviews, getFeaturedReviews, toggleHelpful, getMyReviews, canReviewProduct, getPendingReview,
  getSellerProductReviews, replyToReview,
  getAllReviews, deleteReview, toggleReviewVisibility, toggleReviewFeatured
} = require('../controllers/reviewController');
const { protect, optionalAuth, admin, protectSeller, requirePermission } = require('../middleware/auth');

// Public (optionalAuth only personalises the "helpful" state for logged-in viewers)
router.get('/featured', optionalAuth, getFeaturedReviews);
router.get('/product/:productId', optionalAuth, getProductReviews);

// User
router.post('/', protect, createReview);
router.post('/:id/helpful', protect, toggleHelpful);
router.get('/my-reviews', protect, getMyReviews);
router.get('/can-review/:productId', protect, canReviewProduct);
router.get('/pending', protect, getPendingReview);

// Seller
router.get('/seller/reviews', protectSeller, getSellerProductReviews);
router.put('/:id/reply', protectSeller, replyToReview);

// Admin
router.get('/', protect, admin, requirePermission('reviews'), getAllReviews);
router.delete('/:id', protect, admin, requirePermission('reviews'), deleteReview);
router.put('/:id/toggle-visibility', protect, admin, requirePermission('reviews'), toggleReviewVisibility);
router.put('/:id/toggle-featured', protect, admin, requirePermission('reviews'), toggleReviewFeatured);

module.exports = router;
