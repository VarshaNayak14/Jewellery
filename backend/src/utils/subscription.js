const DAY_MS = 24 * 60 * 60 * 1000;

const durationMonths = (plan) => plan.billingCycle === 'monthly' ? 1 : 12;

const addDuration = (from, plan) => {
  const expiry = new Date(from);
  expiry.setMonth(expiry.getMonth() + durationMonths(plan));
  return expiry;
};

const getCreditPercent = (purchasedAt) => {
  if (!purchasedAt) return 0;
  const days = Math.max(0, (Date.now() - new Date(purchasedAt).getTime()) / DAY_MS);
  return days <= 60 ? 100 : 50;
};

const getPlanCredit = (planPrice, previousAmount, purchasedAt) => {
  const creditPercent = getCreditPercent(purchasedAt);
  const creditAmount = Math.min(Number(planPrice || 0), Math.round(Number(previousAmount || 0) * creditPercent / 100));
  return { creditPercent, creditAmount, payableAmount: Math.max(0, Number(planPrice || 0) - creditAmount) };
};

module.exports = { durationMonths, addDuration, getCreditPercent, getPlanCredit };