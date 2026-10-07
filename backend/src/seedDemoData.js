const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Offer = require('./models/Offer');
const Seller = require('./models/Seller');
const User = require('./models/User');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const { snapshotFromPlan } = require('./utils/planCapabilities');
const { addDuration } = require('./utils/subscription');

// ─────────────────────────────────────────────────────────────────────────
// Demo data for the marketplace homepage — Self-Help Group / handmade style
// products, category images, two demo seller stores and approved homepage
// offers, so every homepage section (offers, parallax, categories, flash sale,
// featured, new arrivals) has something to show and animate.
//
//   npm run seed:demo             → add / refresh the demo data
//   npm run seed:demo -- --remove → delete everything this script added
//
// Demo records are marked (product SKU "DEMO-…", seller emails
// "…@demo.growthkarts.com"), so they're easy to remove before going live.
// Categories are only created or given an image if they had none — existing
// categories are otherwise left as they are.
// ─────────────────────────────────────────────────────────────────────────

const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const IMG = {
  saree: '1610030469983-98e550d6193c', dress: '1595777457583-95e059d581b8', top: '1551488831-00ddcb6c6bd3',
  tshirt: '1618354691373-d851c5c3a990', rackLight: '1558769132-cb1aea458c5e', rackColour: '1601924994987-69e26d50dc26',
  pearls: '1515562141207-7a88fb7ce338', earrings: '1535632066927-ab7c9ab60908', bangles: '1611591437281-460bfbe1220a',
  pendant: '1599643478518-a784e5dc4c8f', candle: '1603006905003-be475563bc59', vases: '1565193566173-7a0ee3dbe261',
  cups: '1610701596007-11502861dcfa', plates: '1578749556568-bc2c40e68b61', cushion: '1584100936595-c0654b55a2e2',
  lamp: '1507473885765-e6ed057f782c', spices: '1596040033229-a9821ebd058d', spiceSpoons: '1506368249639-73a05d6f6488',
  bread: '1509440159596-0249088772ff', coffee: '1495474472287-4d71bcdd2085', icedTea: '1556679343-c7306c1976bc',
  soap: '1600857544200-b2f666a9a2ec', herbal: '1612817288484-6f916006741a', skincare: '1556228578-8c89e6adf883',
  makeup: '1512496015851-a90fb38ba796', handbag: '1584917865442-de89df76afd3', sling: '1548036328-c9fa89d128fa',
  wallet: '1627123424574-724758594e93', yoga: '1544367567-0f2fcb009e0b',
};

const CATEGORIES = [
  { slug: 'clothing', name: 'Clothing', image: IMG.rackLight, types: ['Sarees', 'Kurtis', 'Dresses', 'T-Shirts'] },
  { slug: 'jwellery', name: 'Jwellery', image: IMG.pearls, types: ['Necklaces', 'Earrings', 'Bangles'] },
  { slug: 'handmade-decorative', name: 'Handmade Decorative', image: IMG.vases, types: ['Candles', 'Pottery', 'Home Decor'] },
  { slug: 'food-spices', name: 'Food & Spices', image: IMG.spices, types: ['Masale', 'Bakery', 'Beverages'] },
  { slug: 'beauty-wellness', name: 'Beauty & Wellness', image: IMG.herbal, types: ['Handmade Soaps', 'Skincare', 'Herbal Oils'] },
  { slug: 'bags-accessories', name: 'Bags & Accessories', image: IMG.handbag, types: ['Handbags', 'Sling Bags', 'Wallets'] },
  { slug: 'home-kitchen', name: 'Home & Kitchen', image: IMG.plates, types: ['Tableware', 'Lighting', 'Cushions'] },
];

// [name, category, subCategory, price, mrp, image, flags] — flags: F featured, S flash sale, P → Platinum demo store, G → Gold demo store
const PRODUCTS = [
  ['Handwoven Paithani Silk Saree', 'clothing', 'Sarees', 4499, 6999, IMG.saree, 'F P'],
  ['Floral Cotton Maxi Dress', 'clothing', 'Dresses', 1299, 1899, IMG.dress, 'S'],
  ['Block-Print Cotton Kurti', 'clothing', 'Kurtis', 749, 1199, IMG.top, 'F'],
  ['Hand-Painted Warli Art T-Shirt', 'clothing', 'T-Shirts', 549, 899, IMG.tshirt, 'S'],
  ['Khadi Handloom Stole Set', 'clothing', 'Kurtis', 899, 1399, IMG.rackColour, 'P'],
  ['Handmade Woollen Winter Shrug', 'clothing', 'Kurtis', 1099, 1599, IMG.rackLight, 'F'],
  ['Freshwater Pearl Necklace', 'jwellery', 'Necklaces', 1899, 2999, IMG.pearls, 'F P'],
  ['Kundan Drop Earrings', 'jwellery', 'Earrings', 649, 1099, IMG.earrings, 'S P'],
  ['Gold-Plated Filigree Bangles (Set of 2)', 'jwellery', 'Bangles', 899, 1499, IMG.bangles, 'F'],
  ['Layered Pendant Chain Necklace', 'jwellery', 'Necklaces', 799, 1299, IMG.pendant, 'S'],
  ['Soy Wax Scented Jar Candle', 'handmade-decorative', 'Candles', 449, 699, IMG.candle, 'F S'],
  ['Hand-Thrown Ceramic Vase Trio', 'handmade-decorative', 'Pottery', 1499, 2199, IMG.vases, 'F P'],
  ['Terracotta Planter Cups (Set of 4)', 'handmade-decorative', 'Pottery', 699, 999, IMG.cups, ''],
  ['Rustic Stoneware Dinner Plates (Set of 4)', 'home-kitchen', 'Tableware', 1599, 2299, IMG.plates, 'F'],
  ['Hand-Embroidered Cushion Cover', 'home-kitchen', 'Cushions', 399, 649, IMG.cushion, 'S'],
  ['Handcrafted Wooden Table Lamp', 'home-kitchen', 'Lighting', 1299, 1999, IMG.lamp, 'F'],
  ['Kolhapuri Kanda Lasun Masala (250g)', 'food-spices', 'Masale', 199, 299, IMG.spices, 'F S G'],
  ['Homemade Garam Masala Combo', 'food-spices', 'Masale', 349, 499, IMG.spiceSpoons, 'S G'],
  ['Whole-Wheat Multigrain Bread', 'food-spices', 'Bakery', 89, 120, IMG.bread, 'G'],
  ['Farm-Roasted Filter Coffee Powder', 'food-spices', 'Beverages', 299, 449, IMG.coffee, 'F'],
  ['Kokum Sharbat Concentrate (750ml)', 'food-spices', 'Beverages', 179, 249, IMG.icedTea, 'S'],
  ['Lavender Goat-Milk Handmade Soap (Pack of 3)', 'beauty-wellness', 'Handmade Soaps', 299, 450, IMG.soap, 'F S P'],
  ['Ayurvedic Herbal Hair Oil', 'beauty-wellness', 'Herbal Oils', 349, 499, IMG.herbal, 'P'],
  ['Natural Skincare Gift Set', 'beauty-wellness', 'Skincare', 999, 1499, IMG.skincare, 'F'],
  ['Herbal Kajal & Lip Balm Kit', 'beauty-wellness', 'Skincare', 449, 699, IMG.makeup, 'S'],
  ['Hand-Stitched Leather Handbag', 'bags-accessories', 'Handbags', 1899, 2799, IMG.handbag, 'F P'],
  ['Jute & Cotton Sling Bag', 'bags-accessories', 'Sling Bags', 599, 899, IMG.sling, 'S'],
  ['Handcrafted Leather Wallet', 'bags-accessories', 'Wallets', 499, 799, IMG.wallet, ''],
  ['Handwoven Cotton Yoga Mat', 'home-kitchen', 'Cushions', 899, 1299, IMG.yoga, 'F'],
];

const DEMO_STORES = {
  P: {
    email: 'sakhi@demo.growthkarts.com', name: 'Sunita Patil', planName: 'Platinum',
    shopName: 'Sakhi Mahila Bachat Gat', category: 'Clothing',
    description: 'A women-led Self-Help Group from Pune making handwoven sarees, jewellery, soaps and home décor — every piece made by hand in our village workshop.',
    city: 'Pune', tehsil: 'Haveli', district: 'Pune', state: 'Maharashtra', pincode: '411001',
    phone: '9876500001', upiId: 'sakhibachatgat@upi', logo: IMG.pearls, banner: IMG.rackColour,
  },
  G: {
    email: 'gramin@demo.growthkarts.com', name: 'Anita Jadhav', planName: 'Gold',
    shopName: 'Gramin Swad Udyog', category: 'Food & Spices',
    description: 'Homemade Maharashtrian masale, bakery items and sharbat from a rural women’s group in Nashik — no preservatives, just traditional recipes.',
    city: 'Nashik', tehsil: 'Nashik', district: 'Nashik', state: 'Maharashtra', pincode: '422001',
    phone: '9876500002', upiId: 'graminswad@upi', logo: IMG.spices, banner: IMG.spiceSpoons,
  },
};

const OFFERS = [
  { store: 'P', tag: 'Festive Special', title: 'Handwoven Sarees & Jewellery', description: 'Straight from the looms and hands of our Self-Help Group', discountText: 'Up to 35% OFF', image: IMG.saree, colorFrom: 'from-rose-600', colorTo: 'to-orange-500' },
  { store: 'G', tag: 'Farm Fresh', title: 'Homemade Masale & Snacks', description: 'Traditional recipes, zero preservatives', discountText: 'Flat 30% OFF', image: IMG.spices, colorFrom: 'from-amber-600', colorTo: 'to-red-600' },
  { store: 'P', tag: 'Self-Care', title: 'Handmade Soaps & Herbal Oils', description: 'Natural goodness made by rural women artisans', discountText: 'Buy 2 Get 1', image: IMG.soap, colorFrom: 'from-emerald-600', colorTo: 'to-teal-500' },
  { store: 'P', tag: 'Home Décor', title: 'Pottery, Candles & More', description: 'Brighten your home with handcrafted pieces', discountText: 'From ₹399', image: IMG.vases, colorFrom: 'from-indigo-600', colorTo: 'to-purple-600' },
];

const remove = async () => {
  const users = await User.find({ email: /@demo\.growthkarts\.com$/ }).select('_id');
  const sellers = await Seller.find({ user: { $in: users.map(u => u._id) } }).select('_id');
  const sellerIds = sellers.map(s => s._id);
  const [p, o] = await Promise.all([
    Product.deleteMany({ $or: [{ sku: /^DEMO-/ }, { sellerId: { $in: sellerIds } }] }),
    Offer.deleteMany({ seller: { $in: sellerIds } }),
  ]);
  await Seller.deleteMany({ _id: { $in: sellerIds } });
  await User.deleteMany({ _id: { $in: users.map(u => u._id) } });
  console.table([{ products: p.deletedCount, offers: o.deletedCount, sellers: sellerIds.length, users: users.length }]);
  console.log('Demo categories were kept (they may be in use). Delete them from Admin → Categories if not needed.');
};

const seed = async () => {
  // 1. Categories — create missing, give an image to ones without one
  let catCreated = 0; let catUpdated = 0;
  for (const c of CATEGORIES) {
    const existing = await Category.findOne({ slug: c.slug });
    if (!existing) {
      await Category.create({ name: c.name, slug: c.slug, image: img(c.image, 900), types: c.types, isActive: true, showOnHomepage: true, showInNavbar: true });
      catCreated++;
    } else if (!existing.image || !existing.types?.length) {
      if (!existing.image) existing.image = img(c.image, 900);
      if (!existing.types?.length) existing.types = c.types;
      await existing.save();
      catUpdated++;
    }
  }

  // 2. Demo seller stores (approved, KYC done, active plan)
  const plans = await SubscriptionPlan.find({ purpose: { $ne: 'offer' } });
  const stores = {};
  for (const [key, s] of Object.entries(DEMO_STORES)) {
    const plan = plans.find(p => p.name === s.planName) || plans.sort((a, b) => b.price - a.price)[0];
    let user = await User.findOne({ email: s.email });
    if (!user) user = await User.create({ name: s.name, email: s.email, password: '123456', phone: s.phone, role: 'seller', isActive: true });
    let seller = await Seller.findOne({ user: user._id });
    const now = new Date();
    const data = {
      user: user._id, shopName: s.shopName, description: s.description, category: s.category,
      city: s.city, tehsil: s.tehsil, district: s.district, state: s.state, pincode: s.pincode,
      address: `${s.city}, ${s.district}, ${s.state} ${s.pincode}`,
      phone: s.phone, whatsapp: s.phone, upiId: s.upiId, logo: img(s.logo, 300), banner: img(s.banner, 1600), bannerType: 'image',
      status: 'approved', isVerified: true, paymentVerified: true, 'kyc.status': 'approved',
    };
    if (!seller) seller = new Seller(data); else seller.set(data);
    if (plan && (!seller.planExpiresAt || seller.planExpiresAt <= now)) {
      seller.plan = plan._id;
      seller.planSnapshot = snapshotFromPlan(plan);
      seller.planPurchasedAt = now;
      seller.planExpiresAt = addDuration(now, plan);
    }
    await seller.save();
    stores[key] = seller;
  }

  // 3. Products — most on the platform store (visible everywhere), some on the demo stores
  const flashEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Platform (non-store) demo products belong to the Admin — see seedOwnerProducts.js
  const catalogOwner = await User.findOne({ role: 'admin', isActive: true }).sort('createdAt').select('_id');
  let prodCreated = 0; let prodUpdated = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const [name, category, subCategory, price, originalPrice, imageId, flagStr] = PRODUCTS[i];
    const flags = flagStr.split(/\s+/);
    const storeKey = flags.find(f => stores[f]);
    const isFlashSale = flags.includes('S');
    const sku = `DEMO-${String(i + 1).padStart(3, '0')}`;
    const doc = {
      name, category, subCategory, price, originalPrice,
      discount: Math.round(((originalPrice - price) / originalPrice) * 100),
      description: `${name} — handmade with care by women artisans and Self-Help Groups. Every purchase directly supports a local small business.`,
      images: [img(imageId), img(imageId, 1200)],
      brand: storeKey ? stores[storeKey].shopName : 'growthkarts',
      stock: 25 + ((i * 7) % 60),
      sku,
      tags: [category, subCategory, 'handmade', 'shg'].map(t => t.toLowerCase()),
      isFeatured: flags.includes('F'),
      isFlashSale,
      flashSalePrice: isFlashSale ? Math.round(price * 0.8) : undefined,
      flashSaleEndsAt: isFlashSale ? flashEnds : undefined,
      isActive: true,
      approvalStatus: 'approved',
      sellerId: storeKey ? stores[storeKey]._id : null,
      ownerAdmin: storeKey ? null : (catalogOwner?._id || null),
    };
    const existing = await Product.findOne({ sku });
    if (existing) { existing.set(doc); await existing.save(); prodUpdated++; } else { await Product.create(doc); prodCreated++; }
  }

  // 4. Approved homepage offers
  let offersCreated = 0;
  for (const o of OFFERS) {
    const seller = stores[o.store];
    const exists = await Offer.findOne({ seller: seller._id, title: o.title });
    const data = { ...o, seller: seller._id, image: img(o.image, 1200), link: `/${seller.shopSlug}`, status: 'approved', reviewedAt: new Date() };
    delete data.store;
    if (exists) { exists.set(data); await exists.save(); } else { await Offer.create(data); offersCreated++; }
  }

  console.table([
    { item: 'Categories', created: catCreated, updated: catUpdated },
    { item: 'Products', created: prodCreated, updated: prodUpdated },
    { item: 'Demo stores', created: '-', updated: Object.values(stores).map(s => s.shopName).join(', ') },
    { item: 'Homepage offers', created: offersCreated, updated: OFFERS.length - offersCreated },
  ]);
  console.log('Demo store logins (password 123456):', Object.values(DEMO_STORES).map(s => s.email).join(', '));
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`📦 DB: ${mongoose.connection.db.databaseName}`);
  if (process.argv.includes('--remove')) await remove(); else await seed();
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
