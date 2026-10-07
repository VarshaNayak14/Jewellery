const express = require('express');
const router = express.Router();
const c = require('../controllers/whatsappController');

// Public webhook for the WhatsApp automation provider
router.get('/webhook', c.verifyWebhook);
router.post('/webhook', c.receiveWebhook);

module.exports = router;
