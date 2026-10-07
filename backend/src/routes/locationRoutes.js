const express = require('express');
const router = express.Router();
const { checkPincode } = require('../controllers/locationController');

router.get('/check/:pincode', checkPincode);

module.exports = router;
