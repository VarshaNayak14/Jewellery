const Seller = require('../models/Seller');

const ciExact = (value) => ({ $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' });
const trimmed = (v) => (typeof v === 'string' ? v.trim() : '');

// Only sellers with a valid, active plan snapshot are considered visible in
// public listings. Old demo/seeded entries without a real plan snapshot must
// not be treated as premium businesses just because they have an approved status.
const notExpiredClause = () => ({
  $and: [
    { planSnapshot: { $exists: true, $ne: null } },
    { 'planSnapshot.visibilityScope': { $in: ['tehsil', 'district', 'state', 'india'] } },
    { planExpiresAt: { $exists: true, $ne: null } },
    { planExpiresAt: { $gt: new Date() } },
  ],
});

// The single "does this seller's plan reach the shopper" rule, shared by the
// product listings, the business directory and search. A seller is visible
// only when the shopper's location lies inside the seller's plan area
// (SubscriptionPlan.visibilityScope):
//   india    (Platinum) -> everywhere, even with no location selected
//   state    (Gold)     -> shopper's state    = seller's state
//   district (Silver)   -> shopper's district = seller's district
//   tehsil   (Basic)    -> shopper's tehsil   = seller's tehsil
// A shopper who picked only a state therefore doesn't see district/tehsil
// sellers of that state, and a shopper in tehsil A never sees a tehsil-plan
// seller from tehsil B of the same district.
const visibleSellerClause = ({ state, district, tehsil } = {}) => {
  const s = trimmed(state), d = trimmed(district), t = trimmed(tehsil);
  const reach = [{ 'planSnapshot.visibilityScope': 'india' }];
  if (s) reach.push({ 'planSnapshot.visibilityScope': 'state', state: ciExact(s) });
  if (d) reach.push({ 'planSnapshot.visibilityScope': 'district', district: ciExact(d), ...(s && { state: ciExact(s) }) });
  if (t) reach.push({ 'planSnapshot.visibilityScope': 'tehsil', tehsil: ciExact(t), ...(d && { district: ciExact(d) }), ...(s && { state: ciExact(s) }) });
  return { $and: [notExpiredClause(), { $or: reach }] };
};

// Seller _ids whose products a shopper at this location may see.
async function getVisibleSellerIds(location = {}) {
  return Seller.find({ status: 'approved', ...visibleSellerClause(location) }).distinct('_id');
}

module.exports = { getVisibleSellerIds, visibleSellerClause, notExpiredClause };
