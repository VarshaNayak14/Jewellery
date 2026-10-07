const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist, clearWishlist } = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getWishlist);
router.post('/toggle', toggleWishlist);
router.delete('/clear', clearWishlist);

module.exports = router;
