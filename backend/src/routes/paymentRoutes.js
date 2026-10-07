const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment, getPaymentKey } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.get('/key', getPaymentKey);
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyPayment);

module.exports = router;
