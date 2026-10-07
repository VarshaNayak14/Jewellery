const express = require('express');
const router = express.Router();
const { getActivePlans, getActiveOfferPlans } = require('../controllers/planController');

// Public — anyone visiting "Become a Seller" needs to see the plans, logged in or not
router.get('/', getActivePlans);
router.get('/offers', getActiveOfferPlans);

module.exports = router;