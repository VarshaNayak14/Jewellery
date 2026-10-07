const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getPublicSettings, getPaymentDetails, getLegalPage, updateLegalPage } = require('../controllers/settingsController');
const { protect, admin, requirePermission } = require('../middleware/auth');

// Public — no auth. Must come before the admin-protected '/' GET is
// irrelevant here since the paths differ, but keep it up top for clarity.
router.get('/public', getPublicSettings);
// Public — the Super Admin's bank/UPI/QR details for the seller-registration
// payment step. Safe to expose: no secrets, just where to send money.
router.get('/payment-details', getPaymentDetails);
// Footer legal pages — public to read, Admin / Super Admin (settings) to edit
router.get('/pages/:slug', getLegalPage);
router.put('/pages/:slug', protect, admin, requirePermission('settings'), updateLegalPage);

router.get('/', protect, admin, requirePermission('settings'), getSettings);
router.put('/', protect, admin, requirePermission('settings'), updateSettings);

module.exports = router;