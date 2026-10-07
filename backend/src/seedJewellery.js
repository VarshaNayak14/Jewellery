const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // always load backend/.env
const connectDB = require('./config/db');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');

/**
 * Seeds the jewellery storefront:
 *   1. the "Jewellery" category (+ homepage image),
 *   2. its subcategories, each with its own photo (typeImages),
 *   3. sample products so the navbar mega menu has something to show
 *      (the navbar only lists categories/subcategories that have live products).
 *
 * Safe to run again and again — nothing is duplicated, images/prices are refreshed.
 *
 *   cd backend
 *   node src/seedJewellery.js
 *
 * Photos: by default they are served by your React app (frontend/public/jewelry/*),
 * so keep the frontend running. For production put the photos on Cloudinary and
 * set SEED_IMAGE_BASE=https://res.cloudinary.com/<cloud>/image/upload  (or edit
 * the IMG map below with full https:// URLs).
 */

// ─────────────────────────────────────────────────────────────────────────
// EDIT HERE
// ─────────────────────────────────────────────────────────────────────────
const IMAGE_BASE = (process.env.SEED_IMAGE_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const img = (file) => (/^https?:\/\//.test(file) ? file : `${IMAGE_BASE}/jewelry/${file}`);

const CATEGORY = {
  name: 'Jewellery',
  slug: 'jewellery', // must be the same value the products use in Product.category
  image: img('campaign.jpg'),
};

// subcategory → photo shown in the mega menu + products to create for it
const SUBCATEGORIES = [
  {
    name: 'Rings', image: img('ring.jpg'),
    products: [
      { name: 'Solitaire Diamond Ring', price: 24999, photos: ['ring.jpg', 'hero-gold.jpg'] },
      { name: 'Classic Gold Band Ring', price: 12999, photos: ['hero-gold.jpg', 'ring.jpg'] },
      { name: 'Eternity Stone Ring', price: 18999, photos: ['ring.jpg'] },
    ],
  },
  {
    name: 'Necklaces', image: img('necklace.jpg'),
    products: [
      { name: 'Layered Gold Chain Necklace', price: 15999, photos: ['necklace.jpg', 'campaign.jpg'] },
      { name: 'Delicate Diamond Necklace', price: 21999, photos: ['necklace.jpg'] },
      { name: 'Heritage Gold Necklace', price: 32999, photos: ['campaign.jpg', 'necklace.jpg'] },
    ],
  },
  {
    name: 'Earrings', image: img('earrings.jpg'),
    products: [
      { name: 'Gold Drop Earrings', price: 8999, photos: ['earrings.jpg'] },
      { name: 'Diamond Stud Earrings', price: 14999, photos: ['earrings.jpg', 'hero-gold.jpg'] },
      { name: 'Chandbali Earrings', price: 11999, photos: ['earrings.jpg'] },
    ],
  },
  {
    name: 'Bracelets', image: img('gold-detail.jpg'),
    products: [
      { name: 'Gold Link Bracelet', price: 13999, photos: ['gold-detail.jpg'] },
      { name: 'Tennis Bracelet', price: 27999, photos: ['gold-detail.jpg', 'campaign.jpg'] },
    ],
  },
  {
    name: 'Bangles', image: img('gold-detail.jpg'),
    products: [
      { name: 'Traditional Gold Bangles (Set of 2)', price: 29999, photos: ['gold-detail.jpg'] },
      { name: 'Everyday Slim Bangle', price: 9999, photos: ['gold-detail.jpg', 'campaign.jpg'] },
    ],
  },
  {
    name: 'Pendants', image: img('necklace.jpg'),
    products: [
      { name: 'Teardrop Diamond Pendant', price: 10999, photos: ['necklace.jpg'] },
      { name: 'Initial Gold Pendant', price: 6999, photos: ['necklace.jpg', 'campaign.jpg'] },
    ],
  },
];
// ─────────────────────────────────────────────────────────────────────────

const skuFor = (sub, i) => `JW-${sub.name.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;

const run = async () => {
  await connectDB();
  try {
    // ── 1 + 2. Category and subcategories (with photos) ──────────────────
    const types = SUBCATEGORIES.map((s) => s.name);
    const typeImages = Object.fromEntries(SUBCATEGORIES.map((s) => [s.name, s.image]));

    let category = await Category.findOne({
      $or: [{ slug: CATEGORY.slug }, { name: new RegExp(`^${CATEGORY.name}$`, 'i') }],
    });
    if (!category) {
      category = new Category({ name: CATEGORY.name, slug: CATEGORY.slug, types: [] });
      console.log(`＋ Created category "${CATEGORY.name}"`);
    }
    if (category.slug !== CATEGORY.slug) {
      console.log(`ℹ Existing category uses slug "${category.slug}" — products will use that slug.`);
    }
    const slug = category.slug;

    const have = new Set(category.types.map((t) => t.toLowerCase()));
    types.forEach((t) => { if (!have.has(t.toLowerCase())) category.types.push(t); });
    category.image = CATEGORY.image;
    category.typeImages = { ...Object.fromEntries(category.typeImages || []), ...typeImages };
    category.isActive = true;
    category.showInNavbar = true;
    category.showOnHomepage = true;
    await category.save();
    console.log(`✔ Category ready → ${category.types.join(', ')}`);

    // ── 3. Sample products ───────────────────────────────────────────────
    const owner = await User.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
    if (!owner) console.log('ℹ No admin user found — run `npm run seed` first if you want products owned by an admin.');

    let created = 0;
    let updated = 0;
    for (const sub of SUBCATEGORIES) {
      for (let i = 0; i < sub.products.length; i++) {
        const spec = sub.products[i];
        const sku = skuFor(sub, i);
        const originalPrice = Math.round(spec.price * 1.2);
        const isDiamond = /diamond|solitaire|tennis|eternity|stone/i.test(spec.name);
        const purity = isDiamond ? '18K' : '22K';
        const jewellery = {
          metal: 'gold',
          purity,
          netWeight: Number((spec.price / (isDiamond ? 9000 : 7600)).toFixed(3)),
          grossWeight: Number((spec.price / (isDiamond ? 8200 : 7400)).toFixed(3)),
          gemstone: isDiamond ? 'Diamond' : '',
          diamondClarity: isDiamond ? 'VS1' : '',
          diamondColor: isDiamond ? 'F-G' : '',
          stoneWeight: isDiamond ? 0.25 : undefined,
          makingChargeType: 'percent',
          makingCharge: 12,
          gstPercent: 3,
          pricingMode: 'fixed',
          hallmarked: true,
          certification: isDiamond ? 'IGI' : 'BIS Hallmark',
          gender: 'women',
          occasion: i === 0 ? 'Bridal' : 'Daily Wear',
        };
        const doc = {
          name: spec.name,
          description: `${spec.name} — handcrafted jewellery, finished by hand and made to be worn every day. Comes in a gift-ready box.`,
          price: spec.price,
          originalPrice,
          discount: Math.round(((originalPrice - spec.price) / originalPrice) * 100),
          category: slug,
          subCategory: sub.name,
          productType: sub.name,
          brand: 'TECAI Jewels',
          images: spec.photos.map(img),
          stock: 25,
          sku,
          tags: ['jewellery', sub.name.toLowerCase()],
          jewellery,
          isFeatured: i === 0,
          isFlashSale: false,
          isActive: true,
          approvalStatus: 'approved',
          sellerId: null,
          ownerAdmin: owner ? owner._id : null,
        };

        const existing = await Product.findOne({ sku });
        if (existing) {
          await Product.updateOne({ _id: existing._id }, { $set: doc });
          updated++;
        } else {
          await Product.create(doc);
          created++;
        }
      }
    }

    console.log('\n================ ✅ JEWELLERY SEED COMPLETE ================');
    console.log(`Category: ${category.name} (/${slug}) · ${category.types.length} subcategories with photos`);
    console.log(`Products: ${created} created, ${updated} refreshed`);
    console.log('Reload the site — the mega menu now shows these photos.');
    console.log('============================================================\n');
  } catch (err) {
    console.error('❌ Jewellery seeder error:', err);
  } finally {
    process.exit();
  }
};

run();