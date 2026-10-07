// Internal plan rules ("capabilities") — mapped 1:1 to the plan benefits
// (Basic / Silver / Gold / Platinum). Configured per plan by the Super Admin
// and enforced in the app; never shown to sellers/customers as a list (the
// plan card shows the plan's own `features` text).
//
// Defaults are permissive so plans created before these rules existed keep
// behaving as before until the Super Admin sets them.

const RANKING_LEVELS = { standard: 0, priority: 1, city: 2, state: 3 };

const CAPABILITY_DEFAULTS = {
  storefront: true,         // Dedicated landing page (own store website)
  directPayment: true,      // Direct UPI / QR payment at checkout
  contactButtons: true,     // WhatsApp & Call buttons on public pages
  premiumThemes: true,      // Premium store themes (every theme except Classic)
  analytics: true,          // Business dashboard & analytics
  videoBanner: true,        // Business / brand video banner
  prioritySupport: false,   // Dedicated customer support — seller support tickets handled first, faster reply target
  businessManager: false,   // Personal business manager — a staff member assigned to the seller
  videoMaxMinutes: -1,      // Longest allowed video banner in minutes (-1 = no limit / premium brand video)
  searchRanking: 0,         // 0 standard, 1 priority, 2 city-level top, 3 state-level top
  promoBannersPerYear: 0,   // homepage promotional banners included per year (-1 = unlimited)
};

const BOOL_KEYS = ['storefront', 'directPayment', 'contactButtons', 'premiumThemes', 'analytics', 'videoBanner', 'prioritySupport', 'businessManager'];
const NUM_KEYS = { searchRanking: { min: 0, max: 3 }, promoBannersPerYear: { min: -1, max: 1000 }, videoMaxMinutes: { min: -1, max: 60 } };

// Mongoose schema definition, shared by SubscriptionPlan and Seller.planSnapshot.
const capabilitiesSchemaDef = {
  ...Object.fromEntries(BOOL_KEYS.map(k => [k, { type: Boolean, default: CAPABILITY_DEFAULTS[k] }])),
  ...Object.fromEntries(Object.entries(NUM_KEYS).map(([k, r]) => [k, { type: Number, default: CAPABILITY_DEFAULTS[k], min: r.min, max: r.max }])),
};

const toPlain = (v) => (v && typeof v.toObject === 'function' ? v.toObject() : v) || {};

// Sanitize an incoming capabilities object (from the plan form). Unknown keys
// (e.g. rules from an older version) are dropped.
const normalizeCapabilities = (input = {}, base = CAPABILITY_DEFAULTS) => {
  const src = toPlain(input);
  const b = toPlain(base);
  const out = { ...CAPABILITY_DEFAULTS };
  [...BOOL_KEYS, ...Object.keys(NUM_KEYS)].forEach(k => { if (b[k] !== undefined) out[k] = b[k]; });
  BOOL_KEYS.forEach(k => { if (src[k] !== undefined) out[k] = Boolean(src[k]); });
  Object.entries(NUM_KEYS).forEach(([k, { min, max }]) => {
    if (src[k] === undefined || src[k] === '') return;
    const n = Math.floor(Number(src[k]));
    if (Number.isFinite(n)) out[k] = Math.min(max, Math.max(min, n));
  });
  return out;
};

// Effective rules of a seller (from their plan snapshot).
const sellerCaps = (seller) => normalizeCapabilities(seller?.planSnapshot?.capabilities || {});

// Plan -> Seller.planSnapshot (taken at purchase, re-synced when the plan is edited).
const snapshotFromPlan = (plan) => ({
  name: plan.name,
  price: plan.price,
  productLimit: plan.productLimit,
  visibilityScope: plan.visibilityScope,
  capabilities: normalizeCapabilities(plan.capabilities),
});

// Public-facing seller object, with the current plan's rules applied:
//  - hides phone / WhatsApp when the plan has no contact buttons
//  - falls back to the Classic theme / image banner when the seller moved to a
//    plan without premium themes / video (settings chosen on a higher plan
//    stay saved, so they come back if the seller upgrades again).
const publicSellerView = (seller) => {
  const obj = toPlain(seller);
  const caps = sellerCaps(obj);
  if (!caps.contactButtons) {
    delete obj.phone;
    delete obj.whatsapp;
  }
  if (!caps.premiumThemes && obj.theme && obj.theme !== 'classic') obj.theme = 'classic';
  if (!caps.videoBanner && obj.bannerType === 'video') {
    obj.bannerType = 'image';
    obj.banner = '';
  }
  return obj;
};

// Populate options for a product's seller on public listings — selects just
// what the cards need and applies publicSellerView (e.g. no phone when the
// plan has no WhatsApp & Call buttons).
const publicSellerPopulate = (select = 'shopName shopSlug logo phone status') => ({
  path: 'sellerId',
  select: `${select} planSnapshot.capabilities.contactButtons`,
  transform: (doc) => (doc ? publicSellerView(doc) : doc),
});

// Sort key for directory / search: higher plan ranking first.
const RANKING_SORT_FIELD = 'planSnapshot.capabilities.searchRanking';

module.exports = {
  RANKING_LEVELS, CAPABILITY_DEFAULTS, BOOL_KEYS, capabilitiesSchemaDef,
  normalizeCapabilities, sellerCaps, snapshotFromPlan, publicSellerView, publicSellerPopulate, RANKING_SORT_FIELD,
};
