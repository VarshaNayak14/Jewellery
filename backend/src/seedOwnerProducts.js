const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');

// ─────────────────────────────────────────────────────────────────────────
// Gives every admin-catalog product a real owner, so "My products" and the
// per-owner checkout payment work:
//   1. products with no ownerAdmin (old demo catalog) → the oldest Admin
//   2. 10 Super Admin products (SKU "SA-…"), added or refreshed
//
//   node src/seedOwnerProducts.js           → assign + add / refresh
//   node src/seedOwnerProducts.js --remove  → delete the SA-… products only
// ─────────────────────────────────────────────────────────────────────────

const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// [name, category, subCategory, price, mrp, unsplash photo id, featured]
const SUPERADMIN_PRODUCTS = [
  ['Banarasi Silk Festive Saree', 'clothing', 'Sarees', 5299, 7999, '1610030469983-98e550d6193c', true],
  ['Handloom Cotton Dupatta Set', 'clothing', 'Kurtis', 699, 1099, '1601924994987-69e26d50dc26', false],
  ['Kundan Jhumka Earrings', 'jwellery', 'Earrings', 899, 1499, '1535632066927-ab7c9ab60908', true],
  ['Classic Pearl Choker Necklace', 'jwellery', 'Necklaces', 1599, 2499, '1515562141207-7a88fb7ce338', false],
  ['Hand-Painted Ceramic Vase Pair', 'handmade-decorative', 'Home Decor', 1199, 1799, '1565193566173-7a0ee3dbe261', true],
  ['Stone-Ground Garam Masala (200g)', 'food-spices', 'Masale', 249, 349, '1596040033229-a9821ebd058d', false],
  ['Homestyle Millet Cookies (400g)', 'food-spices', 'Bakery', 299, 399, '1509440159596-0249088772ff', false],
  ['Neem & Turmeric Handmade Soap (Pack of 3)', 'beauty-wellness', 'Handmade Soaps', 349, 499, '1600857544200-b2f666a9a2ec', true],
  ['Ayurvedic Herbal Hair Oil (200ml)', 'beauty-wellness', 'Herbal Oils', 399, 599, '1612817288484-6f916006741a', false],
  ['Embroidered Canvas Handbag', 'bags-accessories', 'Handbags', 1499, 2199, '1584917865442-de89df76afd3', false],
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`📦 DB: ${mongoose.connection.db.databaseName}`);

  if (process.argv.includes('--remove')) {
    const { deletedCount } = await Product.deleteMany({ sku: /^SA-/ });
    console.log(`🗑️  Removed ${deletedCount} Super Admin demo products`);
    return;
  }

  const superAdmin = await User.findOne({ role: 'superadmin', isActive: true }).sort('createdAt');
  const admin = await User.findOne({ role: 'admin', isActive: true }).sort('createdAt');
  if (!superAdmin) throw new Error('No active Super Admin found');

  // 1. Unowned admin-catalog products → the Admin
  if (admin) {
    const { modifiedCount } = await Product.updateMany(
      { sellerId: null, $or: [{ ownerAdmin: null }, { ownerAdmin: { $exists: false } }] },
      { $set: { ownerAdmin: admin._id } },
    );
    console.log(`👤 ${modifiedCount} unowned products assigned to Admin "${admin.name}" (${admin.email})`);
  } else {
    console.log('⚠️  No active Admin found — unowned products left as they are');
  }

  // 2. Super Admin's own products
  let created = 0; let updated = 0;
  for (let i = 0; i < SUPERADMIN_PRODUCTS.length; i++) {
    const [name, category, subCategory, price, originalPrice, imageId, featured] = SUPERADMIN_PRODUCTS[i];
    const sku = `SA-${String(i + 1).padStart(3, '0')}`;
    const doc = {
      name, category, subCategory, price, originalPrice,
      discount: Math.round(((originalPrice - price) / originalPrice) * 100),
      description: `${name} — handpicked by growthkarts from local artisans and small businesses.`,
      images: [img(imageId), img(imageId, 1200)],
      brand: 'growthkarts',
      stock: 20 + ((i * 9) % 50),
      sku,
      tags: [category, subCategory, 'handmade'].map(t => t.toLowerCase()),
      isFeatured: featured,
      isActive: true,
      approvalStatus: 'approved',
      sellerId: null,
      ownerAdmin: superAdmin._id,
    };
    const existing = await Product.findOne({ sku });
    if (existing) { existing.set(doc); await existing.save(); updated++; } else { await Product.create(doc); created++; }
  }
  console.log(`🛍️  Super Admin "${superAdmin.name}" products: ${created} added, ${updated} refreshed`);
};

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => { console.error('❌', err.message); await mongoose.disconnect(); process.exit(1); });
