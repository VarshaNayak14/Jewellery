const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, getOrderTracking, cancelOrder, getAllOrders, updateOrderStatus, reviewAdminPayment, getAdminPaymentTarget, getAdminPaymentGroups } = require('../controllers/orderController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.use(protect);
router.post('/', createOrder);
router.post('/admin-payment-target', getAdminPaymentTarget);
router.post('/admin-payment-groups', getAdminPaymentGroups);
router.put('/:id/admin-payment', admin, reviewAdminPayment);
router.get('/my-orders', getMyOrders);
router.get('/:id/tracking', getOrderTracking);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.get('/', admin, requirePermission('orders'), getAllOrders);
router.put('/:id/status', admin, requirePermission('orders'), updateOrderStatus);

module.exports = router;