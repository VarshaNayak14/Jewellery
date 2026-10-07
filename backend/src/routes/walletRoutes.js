const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyWallet, getMyTransactions } = require('../controllers/walletController');

router.use(protect);
router.get('/', getMyWallet);
router.get('/transactions', getMyTransactions);

module.exports = router;
