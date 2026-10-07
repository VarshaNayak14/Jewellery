const express = require('express');
const router = express.Router();
const { search, suggest, popular } = require('../controllers/searchController');

// Static paths first
router.get('/suggest', suggest);
router.get('/popular', popular);
router.get('/', search);

module.exports = router;