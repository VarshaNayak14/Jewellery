const express = require('express');
const { getSellerAnalytics } = require('../controllers/sellerAnalyticsController');
const router = express.Router();
const {
  registerSeller, loginSeller, getSellerMe,
  updateShopSettings,
  getSellerProducts, createSellerProduct, updateSellerProduct, deleteSellerProduct,
  addSellerProductVariant, updateSellerProductVariant, deleteSellerProductVariant,
  getPublicShop,
  getSellerDashboardStats,
  submitKyc,
  getEarnings, requestWithdrawal, getMyWithdrawals,
  getSellerOrders, updateSellerOrderStatus,
  getSellerCourierPayments, reviewCourierPayment,
  createPlanPaymentOrder, verifyPlanPayment, uploadPaymentProof,
  createSellerPlanPaymentOrder, activateSellerPlan,
  createOfferPlanPaymentOrder, activateOfferPlan, submitOfferPlanBankPayment, getSellerOfferPlans,
  getMyReferrals, getSellerPlans, submitSellerPlanBankPayment,
} = require('../controllers/sellerController');
const {
  getSellerSupport, createSellerTicket, getSellerTicket, replySellerTicket, closeSellerTicket,
} = require('../controllers/supportController');
const { protectSeller, protectSellerAllowExpired } = require('../middleware/auth');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// Public endpoint (no account yet), so keep it tight: images only, 5MB, and a
// small per-IP hourly cap.
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});
const proofLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 20,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});

// Public
router.post('/register', registerSeller);
router.post('/login', loginSeller);
router.get('/shop/:slug', getPublicShop);

// Public — plan-fee payment (Razorpay), used on the "Become a Seller" flow
// before the seller account exists.
router.post('/plan-payment/create-order', createPlanPaymentOrder);
router.post('/plan-payment/verify', verifyPlanPayment);
router.post('/plan-payment/proof', proofLimiter, proofUpload.single('image'), uploadPaymentProof);

// Protected (approved sellers only)
router.get('/me', protectSellerAllowExpired, getSellerMe);
// My Plan — also reachable on an expired plan so the seller can renew / switch
router.get('/plans', protectSellerAllowExpired, getSellerPlans);
router.get('/offer-plans', protectSeller, getSellerOfferPlans);
router.post('/plan-renewal/create-order', protectSellerAllowExpired, createSellerPlanPaymentOrder);
router.post('/plan-renewal/activate', protectSellerAllowExpired, activateSellerPlan);
router.post('/plan-renewal/bank', protectSellerAllowExpired, submitSellerPlanBankPayment);
router.post('/offer-plan-payment/create-order', protectSeller, createOfferPlanPaymentOrder);
router.post('/offer-plan-payment/activate', protectSeller, activateOfferPlan);
router.post('/offer-plan-payment/bank', protectSeller, submitOfferPlanBankPayment);
router.put('/shop', protectSeller, updateShopSettings);
router.get('/dashboard', protectSeller, getSellerDashboardStats);
router.get('/analytics', protectSeller, getSellerAnalytics);
router.put('/kyc', protectSeller, submitKyc);

// Earnings & Withdrawals
router.get('/earnings', protectSeller, getEarnings);
router.get('/withdrawals', protectSeller, getMyWithdrawals);
router.post('/withdrawals', protectSeller, requestWithdrawal);
router.get('/referrals', protectSeller, getMyReferrals);
router.get('/orders', protectSeller, getSellerOrders);
router.put('/orders/:id/status', protectSeller, updateSellerOrderStatus);
router.get('/courier-payments', protectSeller, getSellerCourierPayments);
router.put('/courier-payments/:id/review', protectSeller, reviewCourierPayment);

// Help & Support — also open on an expired plan (e.g. payment problems)
router.get('/support', protectSellerAllowExpired, getSellerSupport);
router.post('/support', protectSellerAllowExpired, createSellerTicket);
router.get('/support/:id', protectSellerAllowExpired, getSellerTicket);
router.post('/support/:id/reply', protectSellerAllowExpired, replySellerTicket);
router.put('/support/:id/close', protectSellerAllowExpired, closeSellerTicket);

// Customer tickets about this seller's orders / products
const customerTickets = require('../controllers/customerTicketController');
router.get('/customer-tickets', protectSeller, customerTickets.getSellerTickets);
router.get('/customer-tickets/:id', protectSeller, customerTickets.getSellerTicket);
router.post('/customer-tickets/:id/reply', protectSeller, customerTickets.replySellerTicket);



// Products
router.get('/products', protectSeller, getSellerProducts);
router.post('/products', protectSeller, createSellerProduct);
router.put('/products/:id', protectSeller, updateSellerProduct);
router.delete('/products/:id', protectSeller, deleteSellerProduct);

// Product Color Variants (same as admin)
router.post('/products/:id/variants', protectSeller, addSellerProductVariant);
router.put('/products/:id/variants/:variantId', protectSeller, updateSellerProductVariant);
router.delete('/products/:id/variants/:variantId', protectSeller, deleteSellerProductVariant);

module.exports = router;