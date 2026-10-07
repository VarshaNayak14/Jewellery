const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────
// COPY CORE DATA — from the commented "# MONGO_URI=" DB (GrowthKarts, source,
// read-only) into the active "MONGO_URI=" DB (GrowthKart, target).
//   • 3 users (superadmin / admin / seller) with the same password (123456)
//   • Srushti's seller shop incl. logos, plan re-linked to the target's plan
//   • categories
// Target's own subscription plans + site settings are kept. All other app
// data in the target is emptied. A JSON backup of the target is written to
// backend/backups/ first. Nothing is written to the source DB.
//
// Run with:  node src/copyCoreToActiveDb.js
// ─────────────────────────────────────────────────────────────────────────

const lines = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split(/\r?\n/);
const pick = (re) => {
  const line = lines.find(l => re.test(l));
  return line && line.replace(re, '').trim();
};
const SOURCE_URI = pick(/^#\s*MONGO_URI=/);
const TARGET_URI = pick(/^MONGO_URI=/);

const WIPE = [
  'carts', 'complaints', 'courierpartners', 'couriersellerpayments', 'enquiries',
  'notifications', 'offers', 'orders', 'payments', 'products',
  'referralbonus', 'returns', 'reviews', 'subscriptionpayments', 'wallets',
  'wallettransactions', 'wishlists', 'withdrawals', 'users', 'sellers', 'categories',
];

const run = async () => {
  if (!SOURCE_URI || !TARGET_URI) throw new Error('Need both "MONGO_URI=" and "# MONGO_URI=" lines in backend/.env');
  if (SOURCE_URI === TARGET_URI) throw new Error('Source and target URIs are the same');

  const S = await mongoose.createConnection(SOURCE_URI).asPromise();
  const D = await mongoose.createConnection(TARGET_URI).asPromise();
  const src = S.db;
  const dst = D.db;
  console.log(`📥 source: ${src.databaseName} (${S.host})`);
  console.log(`📤 target: ${dst.databaseName} (${D.host})`);

  const users = await src.collection('users').find({}).toArray();
  const sellers = await src.collection('sellers').find({}).toArray();
  const categories = await src.collection('categories').find({}).toArray();
  if (!users.length) throw new Error('Source has no users — nothing to copy');

  // 1. Backup target
  const existing = new Set((await dst.listCollections().toArray()).map(c => c.name));
  const dir = path.resolve(__dirname, '../backups', `${dst.databaseName}-before-copy-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of [...WIPE, 'subscriptionplans', 'sitesettings'].filter(n => existing.has(n))) {
    const docs = await dst.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
  }
  console.log(`💾 target backup: ${dir}`);

  // 2. Empty target app data
  for (const name of WIPE.filter(n => existing.has(n))) {
    const { deletedCount } = await dst.collection(name).deleteMany({});
    if (deletedCount) console.log(`🗑️  ${name}: ${deletedCount} deleted`);
  }

  // 3. Copy
  await dst.collection('users').insertMany(users);
  console.log(`👤 users: ${users.map(u => `${u.role}:${u.email}`).join(', ')}`);

  if (categories.length) await dst.collection('categories').insertMany(categories);
  console.log(`📂 categories: ${categories.map(c => c.name).join(', ')}`);

  // Plan _ids differ between DBs — re-link each seller to the target plan of the same name.
  const plans = await dst.collection('subscriptionplans').find({}).toArray();
  for (const seller of sellers) {
    const plan = plans.find(p => p.name === seller.planSnapshot?.name) || plans.find(p => p.name === 'Basic');
    if (plan) {
      seller.plan = plan._id;
      seller.planSnapshot = { name: plan.name, price: plan.price, productLimit: plan.productLimit, visibilityScope: plan.visibilityScope };
    }
  }
  if (sellers.length) await dst.collection('sellers').insertMany(sellers);
  console.log(`🏪 sellers: ${sellers.map(s => `${s.shopName} [${s.planSnapshot?.name || 'no plan'}]`).join(', ')}`);
  console.log(`📦 plans kept in target: ${plans.map(p => p.name).join(', ') || 'NONE'}`);

  await S.close();
  await D.close();
  console.log('✅ Copy complete. Login password for all 3 accounts: 123456');
};

run().catch(err => {
  console.error('❌ Copy failed:', err.message);
  process.exit(1);
});
