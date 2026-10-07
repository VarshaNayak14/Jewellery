const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');
const CourierPartner = require('../models/CourierPartner');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// For public routes that only *personalise* the response when someone is logged
// in (e.g. "you marked this review helpful"): attaches req.user if a valid
// token is sent, and otherwise just carries on as a guest.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      // invalid/expired token — treat as a guest
    }
  }
  next();
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

// Gates one admin module behind the Super Admin's per-admin permission grant.
// Super Admin always passes (full platform control); a regular 'admin' staff
// account needs that module key in req.user.permissions (set via the Super
// Admin > Admins screen). Must run after `admin` so req.user is populated.
const requirePermission = (key) => (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  if (req.user?.role === 'admin' && req.user.permissions?.includes(key)) return next();
  return res.status(403).json({ success: false, message: `You don't have access to this module. Ask your Super Admin to grant "${key}" access.` });
};

// Super Admin only — used for admin-account management & top-level platform control.
// Regular 'admin' staff accounts CANNOT access these routes, only 'superadmin' can.
const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Super Admin access required' });
};

// Seller guard. With allowExpired, a seller whose plan has lapsed still gets
// through — used only for the "My Plan" endpoints so they can renew/switch
// plans without registering again.
const sellerGuard = ({ allowExpired = false } = {}) => async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    if (req.user.role !== 'seller') {
      return res.status(403).json({ success: false, message: 'Seller access required' });
    }
    const seller = await Seller.findOne({ user: req.user._id });
    if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });
    if (seller.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your seller account is ${seller.status}. Please wait for admin approval.`,
        status: seller.status,
      });
    }
    if (!allowExpired && seller.planExpiresAt && seller.planExpiresAt <= new Date()) {
      return res.status(403).json({ success: false, message: 'Your subscription plan has expired. Please renew it before continuing.', status: 'plan_expired', planExpiresAt: seller.planExpiresAt });
    }
    req.seller = seller;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const protectCourier = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) token = req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || req.user.role !== 'courier') return res.status(403).json({ success: false, message: 'Courier access required' });
    // Block/unblock (admin or seller) flips User.isActive — honour it here too,
    // otherwise a blocked courier keeps working with an already-issued token.
    if (!req.user.isActive) return res.status(403).json({ success: false, message: 'Your courier account has been blocked' });
    req.courier = await CourierPartner.findOne({ user: req.user._id });
    if (!req.courier || req.courier.status !== 'approved') return res.status(403).json({ success: false, message: 'Courier account is not approved' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const protectSeller = sellerGuard();
const protectSellerAllowExpired = sellerGuard({ allowExpired: true });

module.exports = { protect, optionalAuth, admin, requirePermission, superAdmin, protectSeller, protectSellerAllowExpired, protectCourier };