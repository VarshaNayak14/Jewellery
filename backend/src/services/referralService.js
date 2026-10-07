const Seller = require('../models/Seller');
const ReferralBonus = require('../models/ReferralBonus');
const SiteSettings = require('../models/SiteSettings');
const Notification = require('../models/Notification');

// One-time referral bonus — % (Super Admin-set) of the plan price the referred
// seller paid, credited to the referrer's available balance. Called once the
// plan payment is actually confirmed (immediately for Razorpay, on Admin
// approval for manual bank/QR transfers). Idempotent: a seller can only ever
// trigger one bonus.
exports.creditReferralBonus = async (seller) => {
  if (!seller.referredBy) return;
  const price = seller.planSnapshot?.price || 0;
  if (price <= 0) return;

  if (await ReferralBonus.exists({ referredSeller: seller._id })) return;

  const referrer = await Seller.findById(seller.referredBy);
  if (!referrer) return;

  const settings = await SiteSettings.findOne();
  const percent = settings?.referralCommissionPercent ?? 10;
  const bonusAmount = Math.round((price * percent) / 100);
  if (bonusAmount <= 0) return;

  referrer.totalEarnings += bonusAmount;
  referrer.availableBalance += bonusAmount;
  referrer.referralBalance += bonusAmount;
  await referrer.save();

  await ReferralBonus.create({
    referrer: referrer._id,
    referredSeller: seller._id,
    planName: seller.planSnapshot?.name,
    planAmount: price,
    percent,
    bonusAmount,
  });

  await Notification.create({
    title: 'Referral Bonus Credited',
    message: `You earned ₹${bonusAmount} for referring ${seller.shopName} to growthkarts (${percent}% of their ${seller.planSnapshot?.name} plan).`,
    type: 'push',
    targetRole: 'seller',
    targetUser: referrer.user,
  });
};
