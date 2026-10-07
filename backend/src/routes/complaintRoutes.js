const express = require('express');
const router = express.Router();
const {
  createComplaint, getMyComplaints, getAllComplaints, updateComplaint
} = require('../controllers/complaintController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.post('/', protect, createComplaint);
router.get('/my', protect, getMyComplaints);

router.get('/', protect, admin, requirePermission('complaints'), getAllComplaints);
router.put('/:id', protect, admin, requirePermission('complaints'), updateComplaint);

module.exports = router;
