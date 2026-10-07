const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getAdminUsers, toggleUserBlock, deleteUser, getSalesReport,
  getInventory, updateProductStock,
} = require('../controllers/adminController');
const {
  getAllSellers, getSellerById, updateSellerStatus,
  getSellerAnalytics, updateSellerKyc, getKycRequests, getSubscriptionPayments,
  getAllWithdrawals, updateWithdrawalStatus, verifyOfferPlanPayment, verifySellerPlanPayment, rejectPlanPayment,
  getProductKycRequirement, updateProductKycRequirement,
} = require('../controllers/adminSellerController');
const {
  getAllTickets, getTicket, replyTicket, updateTicket, getStaff, assignSellerManager,
} = require('../controllers/supportController');
const { getMyPaymentDetails, updateMyPaymentDetails } = require('../controllers/adminPaymentController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.use(protect, admin);

// Own payment details — customers pay for THIS admin's products here
router.get('/payment-details', getMyPaymentDetails);
router.put('/payment-details', updateMyPaymentDetails);

router.get('/dashboard', requirePermission('dashboard'), getDashboardStats);
router.get('/reports/sales', requirePermission('reports'), getSalesReport);

// User management
router.get('/users', requirePermission('users'), getAdminUsers);
router.post('/users', requirePermission('users'), require('../controllers/adminController').createCustomer);
router.put('/users/:id/toggle-block', requirePermission('users'), toggleUserBlock);
router.delete('/users/:id', requirePermission('users'), deleteUser);

// Seller management
router.get('/sellers', requirePermission('sellers'), getAllSellers);
router.post('/sellers', requirePermission('sellers'), require('../controllers/adminSellerController').createSeller);
router.get('/sellers/analytics', requirePermission('sellers'), getSellerAnalytics);
router.get('/sellers/:id', requirePermission('sellers'), getSellerById);
router.put('/sellers/:id/status', requirePermission('sellers'), updateSellerStatus);

// KYC management
router.get('/kyc', requirePermission('kyc'), getKycRequests);
router.get('/kyc/product-requirement', requirePermission('kyc'), getProductKycRequirement);
router.put('/kyc/product-requirement', requirePermission('kyc'), updateProductKycRequirement);
router.put('/sellers/:id/kyc', requirePermission('kyc'), updateSellerKyc);

// Withdrawals (seller payouts)
router.get('/withdrawals', requirePermission('sellers'), getAllWithdrawals);
router.put('/withdrawals/:id/status', requirePermission('sellers'), updateWithdrawalStatus);

// Inventory management
router.get('/inventory', requirePermission('inventory'), getInventory);
router.put('/inventory/:id/stock', requirePermission('inventory'), updateProductStock);

// Subscription payments
router.get('/subscription-payments', requirePermission('subscriptions'), getSubscriptionPayments);
router.put('/subscription-payments/:id/verify-offer-plan', requirePermission('subscriptions'), verifyOfferPlanPayment);
router.put('/subscription-payments/:id/verify-seller-plan', requirePermission('subscriptions'), verifySellerPlanPayment);
router.put('/subscription-payments/:id/reject', requirePermission('subscriptions'), rejectPlanPayment);

// Seller support tickets (Dedicated customer support) + personal business managers
router.get('/support/staff', getStaff);
router.get('/support', requirePermission('support'), getAllTickets);
router.get('/support/:id', requirePermission('support'), getTicket);
router.post('/support/:id/reply', requirePermission('support'), replyTicket);
router.put('/support/:id', requirePermission('support'), updateTicket);

// Customer tickets (escalated from sellers, or about platform products)
const customerTickets = require('../controllers/customerTicketController');
router.get('/customer-tickets', requirePermission('support'), customerTickets.getAllTickets);
router.get('/customer-tickets/:id', requirePermission('support'), customerTickets.getTicket);
router.post('/customer-tickets/:id/reply', requirePermission('support'), customerTickets.replyTicket);
router.put('/customer-tickets/:id', requirePermission('support'), customerTickets.updateTicket);

// WhatsApp enquiries inbox (chats arrive via /api/v1/whatsapp/webhook)
const whatsapp = require('../controllers/whatsappController');
router.get('/whatsapp/chats', requirePermission('support'), whatsapp.getChats);
router.post('/whatsapp/chats', requirePermission('support'), whatsapp.createChat);
router.get('/whatsapp/chats/:id', requirePermission('support'), whatsapp.getChat);
router.post('/whatsapp/chats/:id/reply', requirePermission('support'), whatsapp.replyChat);
router.put('/whatsapp/chats/:id', requirePermission('support'), whatsapp.updateChat);
router.put('/sellers/:id/manager', requirePermission('sellers'), assignSellerManager);
// Admins with the Sellers permission can change a seller's plan too (same action as Super Admin).
router.put('/sellers/:sellerId/plan', requirePermission('sellers'), require('../controllers/planController').assignSellerPlan);


module.exports = router;