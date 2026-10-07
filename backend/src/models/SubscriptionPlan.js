const mongoose = require('mongoose');
const { capabilitiesSchemaDef } = require('../utils/planCapabilities');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. Basic, Silver, Gold, Platinum
  // seller plans are used during seller registration; offer plans only unlock
  // Homepage Offers and must never affect seller visibility or product limits.
  purpose: { type: String, enum: ['seller', 'offer'], default: 'seller', index: true },
  price: { type: Number, required: true, min: 0 }, // annual fee in ₹
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'yearly' },
  durationLabel: { type: String, default: '/ Year' },
  // -1 means unlimited products
  productLimit: { type: Number, required: true, default: 50 },
  // Geographic reach of a seller on this plan. Instead of a pincode count,
  // the plan now controls how wide an area the shop is visible in when a
  // customer browses/searches by location:
  //   tehsil   -> shop shows only within its own tehsil
  //   district -> shop shows anywhere within its own district (all tehsils in it)
  //   state    -> shop shows anywhere within its own state (all districts in it)
  //   india    -> shop shows everywhere in India, no location restriction
  visibilityScope: {
    type: String,
    enum: ['tehsil', 'district', 'state', 'india'],
    required: true,
    default: 'tehsil',
  },
  // Offer plans only: how many homepage banners the seller may have on the
  // main website during the plan (-1 = unlimited).
  bannerLimit: { type: Number, default: -1, min: -1 },
  // Working, enforced plan features (see utils/planCapabilities.js).
  capabilities: { type: new mongoose.Schema(capabilitiesSchemaDef, { _id: false }), default: () => ({}) },
  // Extra display-only highlight lines for the plan card (not enforced).
  features: [{ type: String, trim: true }],
  // Used purely for card styling on the "Become a Seller" plan picker
  badge: { type: String, default: '' }, // e.g. "Most Popular"
  color: {
    type: String,
    enum: ['gray', 'blue', 'yellow', 'purple'],
    default: 'blue',
  },
  // Controls display order on the plan picker (lower = shown first)
  order: { type: Number, default: 0 },
  // Inactive plans are hidden from sellers but kept for historical reference
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);