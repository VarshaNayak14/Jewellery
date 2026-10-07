// One-time helper: give OLD admin products (no seller, no owner) an owner admin,
// so their online payments go to that admin's saved payment details.
//
//   node src/assignProductOwners.js admin@example.com
//
// Only touches products where sellerId is null AND ownerAdmin is empty.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

(async () => {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!email) { console.error('Usage: node src/assignProductOwners.js <admin-email>'); process.exit(1); }
  await connectDB();
  const owner = await User.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
  if (!owner) { console.error(`No admin / superadmin with email ${email}`); process.exit(1); }
  const r = await Product.updateMany(
    { sellerId: null, $or: [{ ownerAdmin: null }, { ownerAdmin: { $exists: false } }] },
    { $set: { ownerAdmin: owner._id } }
  );
  console.log(`Done. ${r.modifiedCount} product(s) now belong to ${owner.name} <${owner.email}>`);
  await mongoose.disconnect();
})();