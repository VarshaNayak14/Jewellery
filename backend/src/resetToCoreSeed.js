const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Seller = require('./models/Seller');
const Category = require('./models/Category');
const SubscriptionPlan = require('./models/SubscriptionPlan');

// ─────────────────────────────────────────────────────────────────────────
// RESET TO CORE — wipes all app data and keeps only:
//   • superadmin@demo.com / admin@demo.com / srushtishivraj1411@gmail.com
//     (password reset to 123456; seller keeps her shop profile)
//   • subscription plans, site settings
//   • 2 categories (Clothing, Jwellery)
// Only this app's collections are touched — the same Atlas DB also holds
// another site's collections (blogs, aiagents, services…), left as is.
// A JSON backup of everything touched is written to backend/backups/ first.
//
// Run with:  node src/resetToCoreSeed.js
// ─────────────────────────────────────────────────────────────────────────

const PASSWORD = '123456';
const KEEP_USERS = [
  { email: 'superadmin@demo.com', name: 'Super Admin', role: 'superadmin' },
  { email: 'admin@demo.com', name: 'Admin User', role: 'admin' },
  { email: 'srushtishivraj1411@gmail.com', name: 'Srushti Shivraj', role: 'seller' },
];
const ADMIN_PERMISSIONS = [
  'dashboard', 'orders', 'products', 'users', 'sellers', 'categories', 'returns', 'reviews',
  'notifications', 'reports', 'settings', 'kyc', 'inventory', 'subscriptions', 'offers', 'support',
];
const KEEP_CATEGORIES = [
  { name: 'Clothing', slug: 'clothing' },
  { name: 'Jwellery', slug: 'jwellery' },
];

// Collections emptied completely
const WIPE = [
  'carts', 'complaints', 'courierpartners', 'couriersellerpayments', 'enquiries',
  'notifications', 'offers', 'orders', 'payments', 'products',
  'referralbonus', 'returns', 'reviews', 'subscriptionpayments', 'wallets',
  'wallettransactions', 'wishlists', 'withdrawals',
];
const BACKUP = [...WIPE, 'users', 'sellers', 'categories', 'subscriptionplans', 'sitesettings'];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map(c => c.name));

  // 1. Backup
  const dir = path.resolve(__dirname, '../backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  for (const name of BACKUP.filter(n => existing.has(n))) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
  }
  console.log(`💾 Backup saved to ${dir}`);

  // 2. Wipe transactional data
  for (const name of WIPE.filter(n => existing.has(n))) {
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(`🗑️  ${name}: ${deletedCount} deleted`);
  }

  // 3. Users — keep only the 3 core accounts (create if missing), reset password
  const emails = KEEP_USERS.map(u => u.email);
  const { deletedCount: usersDeleted } = await User.deleteMany({ email: { $nin: emails } });
  console.log(`🗑️  users: ${usersDeleted} deleted`);
  const users = {};
  for (const spec of KEEP_USERS) {
    let user = await User.findOne({ email: spec.email });
    if (!user) user = new User({ name: spec.name, email: spec.email });
    user.role = spec.role;
    user.password = PASSWORD; // hashed by the pre-save hook
    user.isActive = true;
    user.permissions = spec.role === 'admin' ? ADMIN_PERMISSIONS : [];
    await user.save();
    users[spec.role] = user;
    console.log(`👤 ${spec.role.padEnd(10)} ${spec.email} / ${PASSWORD}`);
  }

  // 4. Sellers — keep only Srushti's shop profile, zero its money counters
  const sellerUser = users.seller;
  const { deletedCount: sellersDeleted } = await Seller.deleteMany({ user: { $ne: sellerUser._id } });
  console.log(`🗑️  sellers: ${sellersDeleted} deleted`);
  const plans = await SubscriptionPlan.find().sort('order');
  let seller = await Seller.findOne({ user: sellerUser._id });
  if (!seller) {
    const basic = plans.find(p => p.name === 'Basic') || plans[0];
    seller = await Seller.create({
      user: sellerUser._id, shopName: 'Saishyam Creation', status: 'approved', category: 'Fashion',
      city: 'Indore', tehsil: 'Indore', district: 'Indore', state: 'Madhya Pradesh',
      ...(basic && {
        plan: basic._id,
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        planSnapshot: { name: basic.name, price: basic.price, productLimit: basic.productLimit, visibilityScope: basic.visibilityScope },
      }),
    });
  }
  // The business directory only lists sellers with a plan + future planExpiresAt
  // + a location, so make sure all of those are set even on an existing shop.
  const basic = plans.find(p => p.name === 'Basic') || plans[0];
  await Seller.updateOne({ _id: seller._id }, {
    $set: {
      totalEarnings: 0, availableBalance: 0, referralBalance: 0, totalWithdrawn: 0, avgRating: 0, numRatings: 0, totalEnquiries: 0,
      city: seller.city || 'Indore', tehsil: seller.tehsil || 'Indore',
      district: seller.district || 'Indore', state: seller.state || 'Madhya Pradesh',
      ...(basic && {
        plan: seller.plan || basic._id,
        planExpiresAt: seller.planExpiresAt > new Date() ? seller.planExpiresAt : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        ...(!seller.planSnapshot?.visibilityScope && {
          planSnapshot: { name: basic.name, price: basic.price, productLimit: basic.productLimit, visibilityScope: basic.visibilityScope },
        }),
      }),
    },
  });
  console.log(`🏪 seller shop: ${seller.shopName}`);

  // 5. Categories — keep only the 2 listed (create if missing)
  const slugs = KEEP_CATEGORIES.map(c => c.slug);
  const { deletedCount: catsDeleted } = await Category.deleteMany({ slug: { $nin: slugs } });
  console.log(`🗑️  categories: ${catsDeleted} deleted`);
  for (const c of KEEP_CATEGORIES) {
    if (!(await Category.findOne({ slug: c.slug }))) await Category.create(c);
  }
  console.log(`📂 categories kept: ${KEEP_CATEGORIES.map(c => c.name).join(', ')}`);
  console.log(`📦 subscription plans kept: ${plans.map(p => p.name).join(', ') || 'NONE'}`);

  await mongoose.disconnect();
  console.log('✅ Reset complete.');
};

run().catch(err => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
