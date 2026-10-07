const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const { AVAILABLE_PERMISSIONS } = require('../config/permissions');

// ─────────────────────────────────────────────────────────────────────────
// GET /api/v1/superadmin/dashboard — platform-wide overview. Revenue is
// subscription-based (connect-only model — no platform-mediated orders).
// ─────────────────────────────────────────────────────────────────────────
exports.getPlatformStats = async (req, res) => {
  const [
    totalAdmins, totalSellers, pendingSellers,
    totalUsers, totalProducts, revenueAgg,
    revenueByMonth, sellersByPlan, sellersByStatus,
  ] = await Promise.all([
    User.countDocuments({ role: 'admin' }),
    Seller.countDocuments(),
    Seller.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'user' }),
    Product.countDocuments(),
    SubscriptionPayment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    SubscriptionPayment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: { year: { $year: '$purchasedAt' }, month: { $month: '$purchasedAt' } }, revenue: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
    Seller.aggregate([
      { $group: { _id: '$planSnapshot.name', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
    ]),
    Seller.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    stats: {
      totalAdmins,
      totalSellers,
      pendingSellers,
      totalUsers,
      totalProducts,
      totalRevenue: revenueAgg[0]?.total || 0,
    },
    revenueByMonth,
    sellersByPlan,
    sellersByStatus,
  });
};

// ─────────────────────────────────────────────────────────────────────────
// Admin staff account management (Super Admin exclusive)
// ─────────────────────────────────────────────────────────────────────────

// GET /api/v1/superadmin/admins
exports.getAllAdmins = async (req, res) => {
  const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
    .select('-password')
    .populate('createdBy', 'name email')
    .sort('-createdAt');
  res.json({ success: true, admins, availablePermissions: AVAILABLE_PERMISSIONS });
};

// POST /api/v1/superadmin/admins — create a new Admin staff account
exports.createAdmin = async (req, res) => {
  const { name, email, password, phone, permissions } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const invalidPerms = (permissions || []).filter(p => !AVAILABLE_PERMISSIONS.includes(p));
  if (invalidPerms.length) {
    return res.status(400).json({ success: false, message: `Invalid permission(s): ${invalidPerms.join(', ')}` });
  }

  const admin = await User.create({
    name, email, password, phone,
    role: 'admin',
    permissions: permissions || [],
    isActive: true,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, permissions: admin.permissions },
  });
};

// PUT /api/v1/superadmin/admins/:id/permissions — update an admin's module access
exports.updateAdminPermissions = async (req, res) => {
  // Drop keys of retired modules (e.g. the old 'videos') still stored on the admin
  const permissions = (req.body.permissions || []).filter(p => AVAILABLE_PERMISSIONS.includes(p));

  const admin = await User.findById(req.params.id);
  if (!admin || admin.role !== 'admin') {
    return res.status(404).json({ success: false, message: 'Admin not found' });
  }

  admin.permissions = permissions || [];
  await admin.save();
  res.json({ success: true, admin: { _id: admin._id, permissions: admin.permissions } });
};

// PUT /api/v1/superadmin/admins/:id/toggle-status — activate/deactivate an admin
exports.toggleAdminStatus = async (req, res) => {
  const admin = await User.findById(req.params.id);
  if (!admin || admin.role !== 'admin') {
    return res.status(404).json({ success: false, message: 'Admin not found' });
  }

  admin.isActive = !admin.isActive;
  await admin.save();
  res.json({ success: true, message: `Admin ${admin.isActive ? 'activated' : 'deactivated'}`, isActive: admin.isActive });
};

// DELETE /api/v1/superadmin/admins/:id
exports.deleteAdmin = async (req, res) => {
  const admin = await User.findById(req.params.id);
  if (!admin || admin.role !== 'admin') {
    return res.status(404).json({ success: false, message: 'Admin not found' });
  }
  if (String(admin._id) === String(req.user._id)) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  }

  await admin.deleteOne();
  res.json({ success: true, message: 'Admin account deleted' });
};