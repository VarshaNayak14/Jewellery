const express = require('express');
const router = express.Router();
const { getRates, updateRates, deleteRate, recalculate } = require('../controllers/metalRateController');
const { protect, admin, requirePermission } = require('../middleware/auth');

router.get('/', getRates);
router.put('/', protect, admin, requirePermission('rates'), updateRates);
router.post('/recalculate', protect, admin, requirePermission('rates'), recalculate);
router.delete('/:id', protect, admin, requirePermission('rates'), deleteRate);

module.exports = router;
