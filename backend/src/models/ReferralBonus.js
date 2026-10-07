const mongoose = require('mongoose');

// One row per referral payout — created once, at the referred seller's
// registration (see sellerController.registerSeller). Kept as a ledger so
// referrers and Admin/SuperAdmin can see the history even after
// SiteSettings.referralCommissionPercent changes later.
const referralBonusSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  referredSeller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  planName: { type: String },
  planAmount: { type: Number, required: true, min: 0 },
  percent: { type: Number, required: true, min: 0 },
  bonusAmount: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ReferralBonus', referralBonusSchema);
