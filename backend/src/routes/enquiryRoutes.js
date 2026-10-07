const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getMyEnquiries,
  updateEnquiryStatus,
  getAllEnquiriesAdmin,
} = require('../controllers/enquiryController');
const { protectSeller, protect, admin } = require('../middleware/auth');

// Public — anyone (logged in or not) can send an enquiry to a business
router.post('/', createEnquiry);

// Seller (business owner) — view & manage their own leads
router.get('/mine', protectSeller, getMyEnquiries);
router.put('/:id/status', protectSeller, updateEnquiryStatus);

// Admin — view all leads across the platform
router.get('/admin/all', protect, admin, getAllEnquiriesAdmin);

module.exports = router;