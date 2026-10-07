const express = require('express');
const router = express.Router();
const {
  getApprovedOffers, getSellerPublicOffers,
  getMyOffers, createOffer, updateOffer, deleteOffer,
  getPendingOffers, getAllOffersAdmin, reviewOffer, assignOfferPlan,
  createPlatformOffer, updatePlatformOffer, deletePlatformOffer, getOfferProductsAdmin,
} = require('../controllers/offerController');
const { protect, admin, protectSeller, requirePermission } = require('../middleware/auth');
const planCtrl = require('../controllers/planController');

// Homepage banner (offer) plans: Admins with the "offers" permission can see
// them (to review requests and assign one to a seller). Creating / editing /
// deleting plans is Super Admin only, via /superadmin/plans.
const asOfferPlan = (req, res, next) => { req.query.purpose = 'offer'; next(); };

// Public
router.get('/approved', getApprovedOffers);
router.get('/seller/:sellerId', getSellerPublicOffers);
router.get('/products', protect, admin, requirePermission('offers'), getOfferProductsAdmin);

// Seller
router.get('/mine', protectSeller, getMyOffers);
router.post('/', protectSeller, createOffer);
router.put('/:id', protectSeller, updateOffer);
router.delete('/:id', protectSeller, deleteOffer);

// Admin / SuperAdmin — homepage banners added by the platform itself
router.post('/admin', protect, admin, requirePermission('offers'), createPlatformOffer);
router.put('/admin/:id', protect, admin, requirePermission('offers'), updatePlatformOffer);
router.delete('/admin/:id', protect, admin, requirePermission('offers'), deletePlatformOffer);

// Admin / SuperAdmin — read the offer plans
router.get('/plans', protect, admin, requirePermission('offers'), asOfferPlan, planCtrl.getAllPlans);

// Admin / SuperAdmin
router.get('/pending', protect, admin, requirePermission('offers'), getPendingOffers);
router.get('/', protect, admin, requirePermission('offers'), getAllOffersAdmin);
router.put('/:id/review', protect, admin, requirePermission('offers'), reviewOffer);
router.put('/sellers/:sellerId/offer-plan', protect, admin, requirePermission('offers'), assignOfferPlan);

module.exports = router;
