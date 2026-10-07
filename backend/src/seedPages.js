const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { seedLegalPages, seedFooter } = require('./utils/legalDefaults');

// ─────────────────────────────────────────────────────────────────────────
// Seeds the footer — its links & description — and the footer pages (Privacy
// Policy, Terms & Conditions, FAQ) with
// their default content. Admin / Super Admin can then edit them from
// Settings → Pages.
//
//   npm run seed:pages            → creates missing pages, keeps edited ones
//   npm run seed:pages -- --force → overwrites all three with the defaults
// ─────────────────────────────────────────────────────────────────────────

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`📦 DB: ${mongoose.connection.db.databaseName}`);
  const force = process.argv.includes('--force');
  const result = [...await seedLegalPages({ force }), ...await seedFooter({ force })];
  console.table(result);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
