const SubscriptionPlan = require('../models/SubscriptionPlan');
const Seller = require('../models/Seller');
const { normalizeCapabilities, snapshotFromPlan } = require('../utils/planCapabilities');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const { addDuration } = require('../utils/subscription');

// One-time seed of the four tiers described in the Pure Reach Connect proposal.
// Runs only if the collection is empty — Super Admin can freely edit/delete/add
// plans afterwards, this just makes sure the picker isn't empty on day one.
// Internal rules for each tier, straight from the plan benefits table
// (higher tiers include everything below them). Exported so
// src/applyPlanRules.js can push them onto existing plans too.
const PLAN_RULES_BY_NAME = {
  // Dedicated landing page, Direct UPI/QR, WhatsApp & Call, standard ranking
  Basic: { storefront: true, directPayment: true, contactButtons: true, premiumThemes: false, analytics: false, videoBanner: false, prioritySupport: false, businessManager: false, videoMaxMinutes: 3, searchRanking: 0, promoBannersPerYear: 0 },
  // + Premium landing page design, priority search, dashboard & analytics, 1 promo banner / year
  Silver: { storefront: true, directPayment: true, contactButtons: true, premiumThemes: true, analytics: true, videoBanner: false, prioritySupport: false, businessManager: false, videoMaxMinutes: 3, searchRanking: 1, promoBannersPerYear: 1 },
  // + 1–3 min business video banner, city-level top ranking, dedicated support
  Gold: { storefront: true, directPayment: true, contactButtons: true, premiumThemes: true, analytics: true, videoBanner: true, prioritySupport: true, businessManager: false, videoMaxMinutes: 3, searchRanking: 2, promoBannersPerYear: 1 },
  // + Premium brand video banner (no length limit), state-level top ranking, personal business manager
  Platinum: { storefront: true, directPayment: true, contactButtons: true, premiumThemes: true, analytics: true, videoBanner: true, prioritySupport: true, businessManager: true, videoMaxMinutes: -1, searchRanking: 3, promoBannersPerYear: 1 },
};

const DEFAULT_PLANS = [
  {
    name: 'Basic',
    capabilities: PLAN_RULES_BY_NAME.Basic,
    price: 1999,
    productLimit: 50,
    visibilityScope: 'tehsil',
    order: 0,
    color: 'gray',
    features: [
      'Dedicated seller landing page',
      'Direct UPI / QR payment',
      'WhatsApp & Call buttons',
      'Standard search ranking',
    ],
  },
  {
    name: 'Silver',
    capabilities: PLAN_RULES_BY_NAME.Silver,
    price: 4999,
    productLimit: 200,
    visibilityScope: 'district',
    order: 1,
    color: 'blue',
    features: [
      'Premium landing page design',
      'Priority local search',
      'Business dashboard & analytics',
      '1 promotional banner per year',
    ],
  },
  {
    name: 'Gold',
    capabilities: PLAN_RULES_BY_NAME.Gold,
    price: 9999,
    productLimit: 500,
    visibilityScope: 'state',
    order: 2,
    color: 'yellow',
    badge: 'Most Popular',
    features: [
      '1–3 min business video banner',
      'City-level top ranking',
      'Dedicated customer support',
    ],
  },
  {
    name: 'Platinum',
    capabilities: PLAN_RULES_BY_NAME.Platinum,
    price: 19999,
    productLimit: -1,
    visibilityScope: 'india',
    order: 3,
    color: 'purple',
    features: [
      'Premium brand video banner',
      'Custom domain option',
      'State-level top ranking',
      'Personal business manager',
    ],
  },
];

const ensureDefaultPlans = async () => {
  const count = await SubscriptionPlan.countDocuments();
  if (count === 0) {
    await SubscriptionPlan.insertMany(DEFAULT_PLANS);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/v1/plans — public, active plans only (used by "Become a Seller")
// ─────────────────────────────────────────────────────────────────────────
exports.getActivePlans = async (req, res) => {
  await ensureDefaultPlans();
  const plans = await SubscriptionPlan.find({ isActive: true, purpose: 'seller' }).sort('order price');
  res.json({ success: true, plans });
};

// Public offer-only catalog used by logged-in sellers before purchasing access.
exports.getActiveOfferPlans = async (req, res) => {
  // Legacy plans created before the seller/offer split have no purpose field.
  // Keep them visible in the offer catalog so existing Super Admin plans do
  // not disappear while newly created plans use purpose: 'offer'.
  const plans = await SubscriptionPlan.find({
    isActive: true,
    $or: [{ purpose: 'offer' }, { purpose: { $exists: false } }],
  }).sort('order price');
  res.json({ success: true, plans });
};

// ─────────────────────────────────────────────────────────────────────────
// Super Admin — full plan management (dynamic add/edit/delete)
// ─────────────────────────────────────────────────────────────────────────

// GET /api/v1/superadmin/plans — all plans, including inactive
exports.getAllPlans = async (req, res) => {
  await ensureDefaultPlans();
  const purpose = req.query.purpose === 'offer' ? 'offer' : 'seller';
  const filter = purpose === 'offer'
    ? { $or: [{ purpose: 'offer' }, { purpose: { $exists: false } }] }
    : { purpose: 'seller' };
  const plans = await SubscriptionPlan.find(filter).sort('order price');
  res.json({ success: true, plans });
};

const VALID_SCOPES = ['tehsil', 'district', 'state', 'india'];

// Offer plans: banners allowed on the homepage; -1 = unlimited.
const cleanBannerLimit = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : -1;
};

// POST /api/v1/superadmin/plans
exports.createPlan = async (req, res) => {
  const { name, price, productLimit, visibilityScope, features, badge, color, order, durationLabel, billingCycle, purpose, capabilities, bannerLimit } = req.body;
  if (!name || price === undefined || productLimit === undefined || !visibilityScope) {
    return res.status(400).json({ success: false, message: 'name, price, productLimit and visibilityScope are required' });
  }
  if (purpose !== 'offer' && !VALID_SCOPES.includes(visibilityScope)) {
    return res.status(400).json({ success: false, message: `visibilityScope must be one of: ${VALID_SCOPES.join(', ')}` });
  }
  if (purpose && !['seller', 'offer'].includes(purpose)) {
    return res.status(400).json({ success: false, message: 'purpose must be seller or offer' });
  }
  const plan = await SubscriptionPlan.create({
    name, price, productLimit: purpose === 'offer' ? 0 : productLimit, visibilityScope: purpose === 'offer' ? 'india' : visibilityScope,
    purpose: purpose || 'seller',
    billingCycle: billingCycle || 'yearly',
    capabilities: normalizeCapabilities(capabilities),
    features: Array.isArray(features) ? features.filter(Boolean) : [],
    badge: badge || '',
    color: color || 'blue',
    order: order ?? 0,
    durationLabel: durationLabel || '/ Year',
    bannerLimit: purpose === 'offer' ? cleanBannerLimit(bannerLimit) : -1,
  });
  res.status(201).json({ success: true, plan });
};

// PUT /api/v1/superadmin/plans/:id
exports.updatePlan = async (req, res) => {
  const { name, price, productLimit, visibilityScope, features, badge, color, order, durationLabel, billingCycle, isActive, purpose, capabilities, bannerLimit } = req.body;
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  if (visibilityScope !== undefined && !VALID_SCOPES.includes(visibilityScope)) {
    return res.status(400).json({ success: false, message: `visibilityScope must be one of: ${VALID_SCOPES.join(', ')}` });
  }
  if (purpose !== undefined && !['seller', 'offer'].includes(purpose)) {
    return res.status(400).json({ success: false, message: 'purpose must be seller or offer' });
  }
  if (billingCycle !== undefined && !['monthly', 'yearly'].includes(billingCycle)) {
    return res.status(400).json({ success: false, message: 'billingCycle must be monthly or yearly' });
  }

  if (name !== undefined) plan.name = name;
  if (purpose !== undefined) plan.purpose = purpose;
  if (price !== undefined) plan.price = price;
  if (productLimit !== undefined) plan.productLimit = productLimit;
  if (visibilityScope !== undefined) plan.visibilityScope = visibilityScope;
  if (features !== undefined) plan.features = Array.isArray(features) ? features.filter(Boolean) : plan.features;
  if (badge !== undefined) plan.badge = badge;
  if (color !== undefined) plan.color = color;
  if (order !== undefined) plan.order = order;
  if (durationLabel !== undefined) plan.durationLabel = durationLabel;
  if (billingCycle !== undefined) plan.billingCycle = billingCycle;
  if (isActive !== undefined) plan.isActive = isActive;
  if (bannerLimit !== undefined && plan.purpose === 'offer') {
    plan.bannerLimit = cleanBannerLimit(bannerLimit);
    // Sellers already on this offer plan get the new limit right away.
    await Seller.updateMany({ offerPlan: plan._id }, { $set: { 'offerPlanSnapshot.bannerLimit': plan.bannerLimit } });
  }
  if (capabilities !== undefined) plan.capabilities = normalizeCapabilities(capabilities, plan.capabilities);

  await plan.save();

  // Plan features are live: push the new limits/capabilities to every seller
  // already on this plan (price stays what they actually paid).
  let sellersUpdated = 0;
  if (plan.purpose !== 'offer') {
    const snap = snapshotFromPlan(plan);
    const result = await Seller.updateMany({ plan: plan._id }, {
      $set: {
        'planSnapshot.name': snap.name,
        'planSnapshot.productLimit': snap.productLimit,
        'planSnapshot.visibilityScope': snap.visibilityScope,
        'planSnapshot.capabilities': snap.capabilities,
      },
    });
    sellersUpdated = result.modifiedCount || 0;
  }
  res.json({ success: true, plan, sellersUpdated });
};

// PUT /api/v1/superadmin/plans/:id/toggle-status
exports.togglePlanStatus = async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  plan.isActive = !plan.isActive;
  await plan.save();
  res.json({ success: true, plan });
};

// DELETE /api/v1/superadmin/plans/:id
exports.deletePlan = async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  await plan.deleteOne();
  res.json({ success: true, message: 'Plan deleted' });
};

// Super Admin can grant or replace a seller plan after verifying an offline payment.
exports.assignSellerPlan = async (req, res) => {
  const { planId } = req.body;
  const [seller, plan] = await Promise.all([
    Seller.findById(req.params.sellerId),
    SubscriptionPlan.findOne({ _id: planId, purpose: 'seller', isActive: true }),
  ]);
  if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
  if (!plan) return res.status(400).json({ success: false, message: 'Active seller plan not found' });
  const purchasedAt = new Date();
  const expiresAt = addDuration(purchasedAt, plan);
  seller.plan = plan._id;
  seller.planSnapshot = snapshotFromPlan(plan);
  seller.planPurchasedAt = purchasedAt;
  seller.planExpiresAt = expiresAt;
  await seller.save();
  await SubscriptionPayment.create({ seller: seller._id, plan: plan._id, planName: plan.name, amount: 0, purpose: 'seller', status: 'paid', paymentMethod: 'admin_assignment', transactionId: `admin-${req.user._id}-${Date.now()}`, purchasedAt, expiresAt });
  res.json({ success: true, message: 'Seller plan assigned', seller, expiresAt });
};
exports.PLAN_RULES_BY_NAME = PLAN_RULES_BY_NAME;
