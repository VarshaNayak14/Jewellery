const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const Seller = require('./models/Seller');
const { PLAN_RULES_BY_NAME } = require('./controllers/planController');
const { normalizeCapabilities, snapshotFromPlan } = require('./utils/planCapabilities');

// ─────────────────────────────────────────────────────────────────────────
// Set the internal plan rules (Basic / Silver / Gold / Platinum, from the plan
// benefits table) on the plans already in the database, and sync every seller
// on those plans. Only `capabilities` is changed — price, product limit,
// visibility and the features text are left as they are. Plans with other
// names are skipped (set those from Super Admin → Plans).
//
//   node src/applyPlanRules.js         → only fills rules the plan doesn't
//                                        have yet (e.g. newly added support /
//                                        manager / video length); keeps
//                                        Super Admin's edits
//   node src/applyPlanRules.js --all   → overwrites every rule with the preset
// ─────────────────────────────────────────────────────────────────────────

const overwriteAll = process.argv.includes('--all');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`📦 DB: ${mongoose.connection.db.databaseName} (${overwriteAll ? 'overwrite all rules' : 'fill missing rules only'})`);

  // Raw documents, so we can tell which rules were never saved (Mongoose
  // would otherwise fill them with schema defaults on load).
  const rawPlans = await SubscriptionPlan.collection.find({ purpose: { $ne: 'offer' } }).toArray();
  for (const raw of rawPlans) {
    const preset = PLAN_RULES_BY_NAME[raw.name];
    if (!preset) { console.log(`⏭️  ${raw.name}: no preset, skipped`); continue; }

    const stored = raw.capabilities || {};
    const missing = Object.keys(preset).filter(k => stored[k] === undefined);
    const next = overwriteAll ? preset : { ...stored, ...Object.fromEntries(missing.map(k => [k, preset[k]])) };
    if (!overwriteAll && missing.length === 0) { console.log(`✔️  ${raw.name}: already up to date`); continue; }

    const plan = await SubscriptionPlan.findById(raw._id);
    plan.capabilities = normalizeCapabilities(next);
    await plan.save();
    const snap = snapshotFromPlan(plan);
    const { modifiedCount } = await Seller.updateMany({ plan: plan._id }, { $set: { 'planSnapshot.capabilities': snap.capabilities } });
    console.log(`✅ ${plan.name}: ${overwriteAll ? 'all rules set' : `added ${missing.join(', ')}`} — ${modifiedCount} seller(s) synced`);
  }

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
