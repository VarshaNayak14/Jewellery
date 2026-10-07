const express = require('express');
const router = express.Router();
const {
  createContactMessage,
  getContactMessagesForSuperAdmin,
} = require('../controllers/contactMessageController');
const { protect, superAdmin } = require('../middleware/auth');

router.post('/', createContactMessage);
router.get('/superadmin/all', protect, superAdmin, getContactMessagesForSuperAdmin);

module.exports = router;
