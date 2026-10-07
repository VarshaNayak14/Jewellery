const express = require('express');
const router = express.Router();
const {
  sendNotification, getMyNotifications, markRead, markAllRead, clearAllNotifications, getAllNotifications
} = require('../controllers/notificationController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.get('/my', protect, getMyNotifications);
router.put('/:id/read', protect, markRead);
router.put('/read-all', protect, markAllRead);
router.delete('/clear-all', protect, clearAllNotifications);

router.post('/', protect, admin, requirePermission('notifications'), sendNotification);
router.get('/all', protect, admin, requirePermission('notifications'), getAllNotifications);

module.exports = router;
