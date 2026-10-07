const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/customerTicketController');

// Customer support tickets (logged-in customer)
router.get('/my', protect, c.getMyTickets);
router.post('/', protect, c.createTicket);
router.get('/:id', protect, c.getMyTicket);
router.post('/:id/reply', protect, c.replyMyTicket);
router.post('/:id/escalate', protect, c.escalateMyTicket);
router.put('/:id/close', protect, c.closeMyTicket);

module.exports = router;
