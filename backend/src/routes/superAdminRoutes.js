const express = require('express');
const router = express.Router();
const {
  getPlatformStats, getAllAdmins, createAdmin,
  updateAdminPermissions, toggleAdminStatus, deleteAdmin,
} = require('../controllers/superAdminController');
const {
  getAllPlans, createPlan, updatePlan, togglePlanStatus, deletePlan, assignSellerPlan,
} = require('../controllers/planController');
const { protect, superAdmin } = require('../middleware/auth');

// Every route here requires a logged-in 'superadmin' — regular Admin staff cannot access these.
router.use(protect, superAdmin);

router.get('/dashboard', getPlatformStats);

router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id/permissions', updateAdminPermissions);
router.put('/admins/:id/toggle-status', toggleAdminStatus);
router.delete('/admins/:id', deleteAdmin);

// Subscription plans — the tiers sellers see on "Become a Seller"
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.put('/plans/:id/toggle-status', togglePlanStatus);
router.delete('/plans/:id', deletePlan);
router.put('/sellers/:sellerId/plan', assignSellerPlan);

module.exports = router;