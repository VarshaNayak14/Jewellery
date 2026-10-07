const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. Basic, Silver, Gold, Platinum
  price: { type: Number, required: true, min: 0 }, // annual fee in ₹
  durationLabel: { type: String, default: '/ Year' },
  // -1 means unlimited products
  productLimit: { type: Number, required: true, default: 50 },
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