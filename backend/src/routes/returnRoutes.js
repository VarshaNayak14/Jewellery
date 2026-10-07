const express = require('express');
const router = express.Router();
const {
  createReturn, getMyReturns, getAllReturns, updateReturnStatus, getReturnStats, getSellerReturns, updateSellerReturnStatus,
  assignSellerReturnCourier, assignAdminReturnCourier, getCourierReturns, updateCourierReturnStatus
} = require('../controllers/returnController');
const { protect, admin, protectSeller, protectCourier, requirePermission } = require('../middleware/auth');

// User routes
router.post('/', protect, createReturn);
router.get('/my-returns', protect, getMyReturns);

// Admin routes
router.get('/', protect, admin, requirePermission('returns'), getAllReturns);
router.get('/stats', protect, admin, requirePermission('returns'), getReturnStats);
router.put('/:id', protect, admin, requirePermission('returns'), updateReturnStatus);
router.put('/:id/assign-courier', protect, admin, requirePermission('returns'), assignAdminReturnCourier);

// Seller routes
router.get('/seller/returns', protectSeller, getSellerReturns);
router.put('/seller/:id', protectSeller, updateSellerReturnStatus);
router.put('/seller/:id/assign-courier', protectSeller, assignSellerReturnCourier);

router.get('/courier/mine', protectCourier, getCourierReturns);
router.put('/courier/:id/status', protectCourier, updateCourierReturnStatus);

module.exports = router;
