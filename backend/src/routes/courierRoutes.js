const express = require('express');
const router = express.Router();
const { admin, protect, protectCourier, protectSeller } = require('../middleware/auth');
const {
  getApprovedCouriers, getAllCouriers, updateCourierStatus, updateCourier, toggleCourierBlock, deleteCourier,
  assignCourier, getCourierOrders, updateCourierOrder, submitSellerPayment, createCourier,
  createSellerCourier, getMySellerCouriers, assignSellerCourier, getMyCourierProfile,
  updateSellerCourier, toggleSellerCourierBlock, deleteSellerCourier, updateMyCourierProfile,
} = require('../controllers/courierController');

router.get('/', protect, admin, getAllCouriers);
router.get('/approved', protect, admin, getApprovedCouriers);
router.post('/', protect, admin, createCourier);
router.put('/:id/status', protect, admin, updateCourierStatus);
router.put('/:id/block', protect, admin, toggleCourierBlock);
router.put('/:id', protect, admin, updateCourier);
router.delete('/:id', protect, admin, deleteCourier);
router.put('/orders/:id/assign', protect, admin, assignCourier);
router.get('/me', protectCourier, getMyCourierProfile);
router.put('/me', protectCourier, updateMyCourierProfile);
router.get('/my-orders', protectCourier, getCourierOrders);
router.put('/orders/:id/status', protectCourier, updateCourierOrder);
router.put('/seller-payments/:id', protectCourier, submitSellerPayment);

// A seller's own delivery partners — separate from the admin-managed
// platform couriers above, scoped to that seller's account and orders only.
router.post('/seller', protectSeller, createSellerCourier);
router.get('/seller/mine', protectSeller, getMySellerCouriers);
router.put('/seller/:id/block', protectSeller, toggleSellerCourierBlock);
router.put('/seller/:id', protectSeller, updateSellerCourier);
router.delete('/seller/:id', protectSeller, deleteSellerCourier);
router.put('/seller/orders/:id/assign', protectSeller, assignSellerCourier);

module.exports = router;