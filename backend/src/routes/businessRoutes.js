const express = require('express');
const router = express.Router();
const {
  searchBusinesses,
  getBusinessProfile,
  getCities,
  getStates,
  getDistricts,
  getTehsils,
  getCategoryCounts,
} = require('../controllers/businessController');

// Order matters — specific static paths before the ':slug' catch-all
router.get('/cities', getCities);
router.get('/states', getStates);
router.get('/districts', getDistricts);
router.get('/tehsils', getTehsils);
router.get('/category-counts', getCategoryCounts);
router.get('/', searchBusinesses);
router.get('/:slug', getBusinessProfile);

module.exports = router;