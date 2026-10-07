const User = require('../models/User');

const hasUsableDetails = (d) => Boolean(d && d.isEnabled !== false && (d.upiId || d.qrCodeImage || (d.accountNumber && d.ifsc)));

// Legacy admin products created before `ownerAdmin` existed have no owner.
// Their payments go to the oldest active Super Admin who has saved payment
// details; if none, to the oldest active Admin who has; else to a Super Admin.
async function getFallbackAdminId() {
  const people = await User.find({ role: { $in: ['superadmin', 'admin'] }, isActive: true })
    .sort('createdAt').select('role +paymentDetails');
  const usable = people.filter(u => hasUsableDetails(u.paymentDetails));
  const pick = usable.find(u => u.role === 'superadmin') || usable[0] || people.find(u => u.role === 'superadmin');
  return pick ? pick._id : null;
}

// products: docs with { _id, sellerId, ownerAdmin } -> Map(productId -> ownerAdminId | null)
async function resolveOwners(products) {
  let fallback;
  const map = new Map();
  for (const p of products) {
    if (p.sellerId) { map.set(String(p._id), null); continue; }
    if (p.ownerAdmin) { map.set(String(p._id), p.ownerAdmin); continue; }
    if (fallback === undefined) fallback = await getFallbackAdminId();
    map.set(String(p._id), fallback);
  }
  return map;
}

// What the customer is allowed to see at checkout.
const publicView = (user) => {
  const d = user.paymentDetails || {};
  return {
    admin: user._id,
    name: d.accountHolder || user.name,
    upiId: d.upiId || '',
    qrCodeImage: d.qrCodeImage || '',
    bankName: d.bankName || '',
    accountNumber: d.accountNumber || '',
    ifsc: d.ifsc || '',
  };
};

// Works out where an all-admin-products cart must be paid.
// -> { available:true, details } | { available:false, reason }
async function resolveAdminPaymentTarget(products) {
  if (!products.length) return { available: false, reason: 'no_items' };
  if (products.some(p => p.sellerId)) return { available: false, reason: 'seller_items' };
  const owners = await resolveOwners(products);
  const ids = [...new Set([...owners.values()].map(v => (v ? String(v) : '')))];
  if (ids.length !== 1 || !ids[0]) return { available: false, reason: ids.length > 1 ? 'multiple_owners' : 'no_owner' };
  const admin = await User.findOne({ _id: ids[0], isActive: true, role: { $in: ['admin', 'superadmin'] } })
    .select('name +paymentDetails');
  if (!admin || !hasUsableDetails(admin.paymentDetails)) return { available: false, reason: 'not_configured' };
  return { available: true, details: publicView(admin) };
}

// Splits admin-catalog products by the Admin / Super Admin who owns them —
// each owner is a separate order and payment at checkout, with their own
// payment details. -> [{ owner, productIds, available, details? }]
async function resolveAdminPaymentGroups(products) {
  const owners = await resolveOwners(products.filter(p => !p.sellerId));
  const byOwner = new Map();
  for (const [productId, owner] of owners) {
    const key = owner ? String(owner) : '';
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(productId);
  }
  const admins = await User.find({ _id: { $in: [...byOwner.keys()].filter(Boolean) }, isActive: true, role: { $in: ['admin', 'superadmin'] } })
    .select('name +paymentDetails');
  return [...byOwner.entries()].map(([owner, productIds]) => {
    const admin = admins.find(a => String(a._id) === owner);
    const available = Boolean(admin && hasUsableDetails(admin.paymentDetails));
    return { owner: owner || null, productIds, available, ...(available && { details: publicView(admin) }) };
  });
}

module.exports = { resolveOwners, resolveAdminPaymentTarget, resolveAdminPaymentGroups, hasUsableDetails, publicView, getFallbackAdminId };