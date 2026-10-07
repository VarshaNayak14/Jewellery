const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // always load backend/.env, no matter which folder you run this from
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Seller = require('./models/Seller');
const User = require('./models/User');

// ───────────────────────────────────────────────────────────────────────────
// Sample products across the marketplace categories.
// ───────────────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  { name: 'Black', code: '#111111' },
  { name: 'White', code: '#f5f5f5' },
  { name: 'Navy Blue', code: '#1e3a8a' },
  { name: 'Maroon', code: '#7f1d1d' },
  { name: 'Beige', code: '#e8dcc8' },
  { name: 'Olive Green', code: '#556b2f' },
  { name: 'Mustard Yellow', code: '#d4a017' },
  { name: 'Grey', code: '#6b7280' },
];

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const KIDS_SIZES = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y'];

const PRODUCT_IMAGE_SETS = {
  'T-Shirt': 'photo-1521572163474-6864f9cf17ab',
  Shirt: 'photo-1596755389378-c31d21fd1273',
  Hoodie: 'photo-1556821840-3a63f95609a7',
  Jacket: 'photo-1551028719-00167b16eac5',
  Jeans: 'photo-1542272604-787c3835535d',
  Trousers: 'photo-1594633312681-425c7b97ccd1',
  Shorts: 'photo-1565084888279-aca607ecce0c',
  Sneakers: 'photo-1542291026-7eec264c27ff',
  Sandals: 'photo-1603487742131-4160ec999306',
  Kurta: 'photo-1583391733956-6c78276477e5',
  Saree: 'photo-1610030469983-98e550d6193c',
  'Kurta Set': 'photo-1597983073493-88cd35cf93d0',
  Dress: 'photo-1595777457583-95e059d581b8',
  Top: 'photo-1551488831-00ddcb6c6bd3',
  'Co-ord Set': 'photo-1618244972963-dbee1a7edc95',
  Shrug: 'photo-1591369822096-ffd140ec948f',
  Heels: 'photo-1543163521-1bf539c55dd2',
  Flats: 'photo-1543163521-1bf539c55dd2',
  Nightwear: 'photo-1578681994506-b8f463449011',
  Lehenga: 'photo-1583391733956-6c78276477e5',
  Jumpsuit: 'photo-1591369822096-ffd140ec948f',
  'Handbag': 'photo-1584917865442-de89df76afd3',
  Backpack: 'photo-1553062407-98eeb64c6a62',
  Wallet: 'photo-1627123424574-724758594e93',
  'Sling Bag': 'photo-1548036328-c9fa89d128fa',
  'Analog Watch': 'photo-1524805444758-089113d48a6d',
  Sunglasses: 'photo-1511499767150-a48a237f0083',
  Belt: 'photo-1624222247344-550fb60583dc',
  Laptop: 'photo-1496181133206-80ce9b88a853',
  Headphones: 'photo-1505740420928-5e560c06d30e',
  Speaker: 'photo-1589003077984-894e133dabab',
  Camera: 'photo-1516035069371-29a1b244cc32',
  'Smart Watch': 'photo-1523275335684-37898b6baf30',
  'Coffee Maker': 'photo-1495474472287-4d71bcdd2085',
  'Table Lamp': 'photo-1507473885765-e6ed057f782c',
  Cushion: 'photo-1584100936595-c0654b55a2e2',
  Skincare: 'photo-1556228578-8c89e6adf883',
  Makeup: 'photo-1512496015851-a90fb38ba796',
  Yoga: 'photo-1544367567-0f2fcb009e0b',
  Dumbbells: 'photo-1583454110551-21f2fa2afe61',
};

const getImageSet = (spec) => {
  const imageId = PRODUCT_IMAGE_SETS[spec.productType] || PRODUCT_IMAGE_SETS[spec.category === 'accessories' ? 'Handbag' : 'T-Shirt'];
  return [0, 1, 2].map(() => `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=700&q=85`);
};

const PRODUCTS_SPEC = [
  // ── Men's Fashion (12) ──────────────────────────────────────────────────
  { category: 'men', subCategory: 'Topwear', productType: 'T-Shirt', name: 'Men Cotton Crew-Neck T-Shirt', price: 599, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Topwear', productType: 'Shirt', name: 'Men Slim-Fit Formal Shirt', price: 1099, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Topwear', productType: 'Shirt', name: 'Men Checked Casual Shirt', price: 899, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Topwear', productType: 'Hoodie', name: 'Men Fleece Pullover Hoodie', price: 1499, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Topwear', productType: 'Jacket', name: 'Men Bomber Jacket', price: 2199, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Bottomwear', productType: 'Jeans', name: 'Men Slim-Fit Stretch Jeans', price: 1399, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Bottomwear', productType: 'Trousers', name: 'Men Formal Trousers', price: 1199, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Bottomwear', productType: 'Shorts', name: 'Men Cotton Cargo Shorts', price: 799, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Footwear', productType: 'Sneakers', name: 'Men Running Sneakers', price: 1899, sizes: ['7', '8', '9', '10', '11'] },
  { category: 'men', subCategory: 'Footwear', productType: 'Sandals', name: 'Men Leather Sandals', price: 899, sizes: ['7', '8', '9', '10', '11'] },
  { category: 'men', subCategory: 'Ethnic', productType: 'Kurta', name: 'Men Cotton Kurta', price: 1299, sizes: CLOTHING_SIZES },
  { category: 'men', subCategory: 'Winterwear', productType: 'Sweater', name: 'Men Wool-Blend Sweater', price: 1599, sizes: CLOTHING_SIZES },

  // ── Women's Fashion (13) ────────────────────────────────────────────────
  { category: 'women', subCategory: 'Topwear', productType: 'Kurti', name: 'Women Printed A-Line Kurti', price: 799, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Ethnic', productType: 'Saree', name: 'Women Banarasi Silk Saree', price: 2499, sizes: ['Free Size'] },
  { category: 'women', subCategory: 'Ethnic', productType: 'Kurta Set', name: 'Women Embroidered Kurta Set', price: 1899, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Western', productType: 'Dress', name: 'Women Floral Maxi Dress', price: 1399, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Western', productType: 'Top', name: 'Women Puff-Sleeve Top', price: 649, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Western', productType: 'Jeans', name: 'Women High-Waist Skinny Jeans', price: 1299, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Western', productType: 'Co-ord Set', name: 'Women Co-ord Set', price: 1699, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Winterwear', productType: 'Shrug', name: 'Women Knit Shrug', price: 899, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Footwear', productType: 'Heels', name: 'Women Block Heel Sandals', price: 1199, sizes: ['4', '5', '6', '7', '8'] },
  { category: 'women', subCategory: 'Footwear', productType: 'Flats', name: 'Women Bellies Flats', price: 699, sizes: ['4', '5', '6', '7', '8'] },
  { category: 'women', subCategory: 'Innerwear', productType: 'Nightwear', name: 'Women Cotton Night Suit', price: 799, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Ethnic', productType: 'Lehenga', name: 'Women Party-Wear Lehenga', price: 3499, sizes: CLOTHING_SIZES },
  { category: 'women', subCategory: 'Western', productType: 'Jumpsuit', name: 'Women Sleeveless Jumpsuit', price: 1599, sizes: CLOTHING_SIZES },

  // ── Kids Fashion (13) ───────────────────────────────────────────────────
  { category: 'kids', subCategory: 'Boys', productType: 'T-Shirt', name: 'Boys Printed Cotton T-Shirt', price: 399, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Boys', productType: 'Shirt', name: 'Boys Checked Shirt', price: 499, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Boys', productType: 'Shorts', name: 'Boys Denim Shorts', price: 449, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Boys', productType: 'Ethnic Set', name: 'Boys Kurta Pyjama Set', price: 899, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Girls', productType: 'Frock', name: 'Girls Party Frock', price: 799, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Girls', productType: 'Dress', name: 'Girls Printed Cotton Dress', price: 599, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Girls', productType: 'Top', name: 'Girls Ruffle Top', price: 449, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Girls', productType: 'Ethnic Set', name: 'Girls Lehenga Choli Set', price: 1199, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Infant', productType: 'Romper', name: 'Infant Cotton Romper', price: 349, sizes: ['0-3M', '3-6M', '6-12M'] },
  { category: 'kids', subCategory: 'Infant', productType: 'Onesie', name: 'Infant Sleepsuit Onesie', price: 399, sizes: ['0-3M', '3-6M', '6-12M'] },
  { category: 'kids', subCategory: 'Unisex', productType: 'Winterwear', name: 'Kids Hooded Sweatshirt', price: 699, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Unisex', productType: 'Nightwear', name: 'Kids Cotton Night Suit', price: 499, sizes: KIDS_SIZES },
  { category: 'kids', subCategory: 'Boys', productType: 'Trousers', name: 'Boys Cargo Trousers', price: 549, sizes: KIDS_SIZES },

  // ── Accessories (12) ────────────────────────────────────────────────────
  { category: 'accessories', subCategory: 'Jewelry', productType: 'Earrings', name: 'Oxidised Silver Jhumka Earrings', price: 349, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Jewelry', productType: 'Necklace', name: 'Kundan Choker Necklace Set', price: 999, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Jewelry', productType: 'Bangles', name: 'Gold-Plated Bangle Set', price: 599, sizes: ['2.4', '2.6', '2.8'] },
  { category: 'accessories', subCategory: 'Jewelry', productType: 'Ring', name: 'Adjustable Stone Ring', price: 249, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Bags', productType: 'Handbag', name: 'Women Structured Handbag', price: 1299, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Bags', productType: 'Backpack', name: 'Unisex Casual Backpack', price: 999, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Bags', productType: 'Wallet', name: 'Men Leather Bifold Wallet', price: 549, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Bags', productType: 'Sling Bag', name: 'Women Sling Bag', price: 799, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Watches', productType: 'Analog Watch', name: 'Men Analog Steel Watch', price: 1499, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Watches', productType: 'Analog Watch', name: 'Women Rose Gold Watch', price: 1699, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Eyewear', productType: 'Sunglasses', name: 'Unisex UV-Protected Sunglasses', price: 649, sizes: ['Free Size'] },
  { category: 'accessories', subCategory: 'Belts', productType: 'Belt', name: 'Men Genuine Leather Belt', price: 449, sizes: ['30', '32', '34', '36'] },

  // ── Everyday Marketplace (12) ──────────────────────────────────────────
  { category: 'electronics', subCategory: 'Computers', productType: 'Laptop', name: 'Ultra-Slim Everyday Laptop', price: 54999, sizes: ['Free Size'] },
  { category: 'electronics', subCategory: 'Audio', productType: 'Headphones', name: 'Wireless Noise-Cancelling Headphones', price: 2999, sizes: ['Free Size'] },
  { category: 'electronics', subCategory: 'Audio', productType: 'Speaker', name: 'Portable Bluetooth Speaker', price: 1499, sizes: ['Free Size'] },
  { category: 'electronics', subCategory: 'Cameras', productType: 'Camera', name: 'Mirrorless Travel Camera', price: 42999, sizes: ['Free Size'] },
  { category: 'electronics', subCategory: 'Wearables', productType: 'Smart Watch', name: 'Smart Fitness Watch', price: 2499, sizes: ['Free Size'] },
  { category: 'home', subCategory: 'Appliances', productType: 'Coffee Maker', name: 'Compact Drip Coffee Maker', price: 2299, sizes: ['Free Size'] },
  { category: 'home', subCategory: 'Lighting', productType: 'Table Lamp', name: 'Minimal Desk Table Lamp', price: 899, sizes: ['Free Size'] },
  { category: 'home', subCategory: 'Decor', productType: 'Cushion', name: 'Textured Decorative Cushion', price: 499, sizes: ['Free Size'] },
  { category: 'beauty', subCategory: 'Skincare', productType: 'Skincare', name: 'Daily Hydration Skincare Set', price: 1299, sizes: ['Free Size'] },
  { category: 'beauty', subCategory: 'Makeup', productType: 'Makeup', name: 'Everyday Makeup Essentials Kit', price: 999, sizes: ['Free Size'] },
  { category: 'sports', subCategory: 'Fitness', productType: 'Yoga', name: 'Non-Slip Yoga Mat', price: 799, sizes: ['Free Size'] },
  { category: 'sports', subCategory: 'Fitness', productType: 'Dumbbells', name: 'Adjustable Home Dumbbell Set', price: 1899, sizes: ['Free Size'] },
];

// Deterministic-ish "random" pick helper
const pick = (arr, n) => arr.slice(0, n);
const randPercent = (min, max) => Math.floor(min + Math.random() * (max - min));

const buildProduct = (spec, index, sellerId) => {
  const originalPrice = Math.round(spec.price * (1 + randPercent(15, 40) / 100));
  const discount = Math.round(((originalPrice - spec.price) / originalPrice) * 100);
  const colors = pick(COLOR_PALETTE, 2 + (index % 2)); // 2-3 colors per product
  const isFeatured = index % 6 === 0;
  const isFlashSale = index % 8 === 0;

  const mainImages = getImageSet(spec);

  const variants = colors.map((c, ci) => ({
    colorName: c.name,
    colorCode: c.code,
    price: spec.price,
    originalPrice,
    stock: randPercent(15, 80),
    sku: `${spec.category.toUpperCase()}-${index}-${c.name.replace(/\s+/g, '').toUpperCase()}`,
    sizes: spec.sizes,
    images: [mainImages[ci % mainImages.length]],
    isActive: true,
    isDefault: ci === 0,
    sortOrder: ci,
  }));

  const colorImages = {};
  colors.forEach((c, ci) => { colorImages[c.name] = [mainImages[ci % mainImages.length]]; });

  return {
    name: spec.name,
    description: `${spec.name} — quality essentials selected for everyday use. Crafted with care for lasting value, comfort and style.`,
    price: spec.price,
    originalPrice,
    discount,
    category: spec.category,
    subCategory: spec.subCategory,
    productType: spec.productType,
    brand: 'growthkarts',
    images: mainImages,
    colorImages,
    sizes: spec.sizes,
    colors: colors.map(c => c.name),
    stock: variants.reduce((sum, v) => sum + v.stock, 0),
    sku: `GK-${spec.category.toUpperCase()}-${String(index).padStart(3, '0')}`,
    tags: [spec.category, spec.subCategory, spec.productType].filter(Boolean).map(t => t.toLowerCase()),
    isFeatured,
    isFlashSale,
    flashSalePrice: isFlashSale ? Math.round(spec.price * 0.8) : undefined,
    flashSaleEndsAt: isFlashSale ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
    isActive: true,
    approvalStatus: 'approved',
    variants,
    sellerId: sellerId || null,
  };
};

const runProductSeeder = async () => {
  await connectDB();
  try {
    // Look up the two approved demo sellers (created by seeder.js) so some
    // products are attributed to sellers instead of only the Admin/growthkarts store.
    const sellerEmails = ['seller@demo.com', 'seller1@demo.com'];
    const sellerUsers = await User.find({ email: { $in: sellerEmails } });
    const sellerProfiles = await Seller.find({ user: { $in: sellerUsers.map(u => u._id) }, status: 'approved' });

    let created = 0, skipped = 0;
    for (let i = 0; i < PRODUCTS_SPEC.length; i++) {
      const spec = PRODUCTS_SPEC[i];
      // First 30 products go to the platform (Admin/growthkarts) store,
      // remaining ones are split across the approved demo sellers.
      const sellerId = i < 30 || sellerProfiles.length === 0
        ? null
        : sellerProfiles[i % sellerProfiles.length]._id;

      const productData = buildProduct(spec, i + 1, sellerId);

      const exists = await Product.findOne({ sku: productData.sku });
      if (exists) {
        await Product.updateOne(
          { _id: exists._id },
          { $set: { images: productData.images, colorImages: productData.colorImages, variants: productData.variants } },
        );
        skipped++;
        continue;
      }

      await Product.create(productData);
      created++;
    }

    console.log('\n================ ✅ PRODUCT SEEDING COMPLETE ================');
    console.log(`Created: ${created} | Skipped (already existed): ${skipped} | Total in spec: ${PRODUCTS_SPEC.length}`);
    console.log('Categories used: fashion, accessories, electronics, home, beauty and sports.');
    console.log('First 30 → Admin/growthkarts store. Remaining → split across seller@demo.com & seller1@demo.com.');
    console.log('Images are matched to each product type and can be replaced from the Products page.');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('❌ Product seeder error:', error);
  } finally {
    process.exit();
  }
};

runProductSeeder();