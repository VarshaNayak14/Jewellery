const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const SubscriptionPlan = require('./models/SubscriptionPlan');

// ─────────────────────────────────────────────────────────────────────────
// Homepage banner ("offer") plans a seller can buy to put promotional
// banners on the main website. bannerLimit = banners allowed during the
// plan (-1 = unlimited). No 1-banner plan: Silver and above already include
// 1 promotional banner per year (capability promoBannersPerYear).
// Plans are matched by name, so running this again refreshes them instead
// of adding duplicates; edit them any time from Super Admin → Homepage Offers.
//
//   node src/seedOfferPlans.js           → add / refresh
//   node src/seedOfferPlans.js --remove  → delete these plans
// ─────────────────────────────────────────────────────────────────────────

const OFFER_PLANS = [
  {
    name: 'Banner Pro', price: 1299, billingCycle: 'monthly', durationLabel: '/ Month', bannerLimit: 3, order: 1, badge: 'Popular',
    features: ['3 homepage banners for 30 days', 'Run different offers at the same time', 'Discount applied to chosen products'],
  },
  {
    name: 'Banner Yearly', price: 4999, billingCycle: 'yearly', durationLabel: '/ Year', bannerLimit: 12, order: 2,
    features: ['12 homepage banners in a year', 'One fresh offer every month', 'Best for festive seasons'],
  },
  {
    name: 'Banner Unlimited', price: 9999, billingCycle: 'yearly', durationLabel: '/ Year', bannerLimit: -1, order: 3,
    features: ['Unlimited homepage banners for a year', 'Change offers any time', 'For shops that promote often'],
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`📦 DB: ${mongoose.connection.db.databaseName}`);
  const names = OFFER_PLANS.map(p => p.name);

  if (process.argv.includes('--remove')) {
    const { deletedCount } = await SubscriptionPlan.deleteMany({ purpose: 'offer', name: { $in: names } });
    console.log(`🗑️  Removed ${deletedCount} offer plan(s)`);
    return;
  }

  for (const p of OFFER_PLANS) {
    const doc = {
      ...p,
      purpose: 'offer',
      productLimit: 0,          // offer plans never change product limits
      visibilityScope: 'india', // or seller visibility
      color: 'blue',
      badge: p.badge || '',
      isActive: true,
    };
    const existing = await SubscriptionPlan.findOne({ purpose: 'offer', name: p.name });
    if (existing) { existing.set(doc); await existing.save(); } else { await SubscriptionPlan.create(doc); }
    console.log(`${existing ? '♻️  Refreshed' : '✅ Added'}  ${p.name} — ₹${p.price} ${p.durationLabel}, ${p.bannerLimit === -1 ? 'unlimited' : p.bannerLimit} banner(s)`);
  }
};

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => { console.error('❌', err.message); await mongoose.disconnect(); process.exit(1); });
