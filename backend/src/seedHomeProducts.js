const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // always load backend/.env
const connectDB = require('./config/db');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');

/**
 * Fills the HOME PAGE with a full diamond & gold jewellery catalogue
 * (rings, solitaires, couple bands, earrings, necklaces, pendants, bracelets,
 * bangles, chains, mangalsutra, nose pins, jewellery sets).
 *
 *   13 subcategories x 8 products = 104 products
 *   - prices from Rs 799 to Rs 1.5 lakh (so every "Shop by budget" card has products)
 *   - a few flash-sale + featured products, ratings and reviews
 *   - every subcategory gets its own photo (Category.typeImages) -> navbar mega menu,
 *     "The collection", "Our Collections", "Top Categories" and the gallery all fill up
 *
 * Safe to run again and again (matched by SKU "OR-xxxx-nnn").
 *
 *   cd backend
 *   node src/seedHomeProducts.js            # add / refresh the products
 *   node src/seedHomeProducts.js --clean    # first delete the old OR-* products, then re-create
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PHOTOS
 * By default the products use the 6 photos that already ship with the project
 * (frontend/public/jewelry/*.jpg), so the site works out of the box.
 *
 * For REAL, different photos per product (recommended), drop your own / licensed
 * product photos in these folders — the seed picks them up automatically:
 *
 *   frontend/public/products/rings/            *.jpg | *.png | *.webp
 *   frontend/public/products/solitaires/
 *   frontend/public/products/couple-bands/
 *   frontend/public/products/earrings/
 *   frontend/public/products/necklaces/
 *   frontend/public/products/pendants/
 *   frontend/public/products/bracelets/
 *   frontend/public/products/bangles/
 *   frontend/public/products/chains/
 *   frontend/public/products/mangalsutra/
 *   frontend/public/products/nose-pins/
 *   frontend/public/products/jewellery-sets/
 *   frontend/public/products/bride/
 *   frontend/public/products/all/              (optional: used for any folder that is empty)
 *
 * Then run:  node src/seedHomeProducts.js --clean
 * (Photos are served by the React app, so keep the frontend running. For production
 *  upload them to Cloudinary and set SEED_IMAGE_BASE, or put https:// URLs in IMAGE_URLS below.)
 * ───────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────
// EDIT HERE
// ─────────────────────────────────────────────────────────────────────────
const IMAGE_BASE = (process.env.SEED_IMAGE_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const PUBLIC_DIR = path.resolve(__dirname, '../../frontend/public');

// Optional: full https:// photo URLs per type slug (used before folders and stock photos)
//   e.g.  rings: ['https://res.cloudinary.com/xxx/image/upload/rings1.jpg', ...]
const IMAGE_URLS = {};

const CATEGORY = { name: 'Jewellery', slug: 'jewellery', image: 'campaign.jpg' };
const BRAND = 'TECAI Jewels';

// stock photos that ship with the project, per type (first = main photo)
const STOCK = {
  rings: ['ring.jpg', 'hero-gold.jpg'],
  solitaires: ['hero-gold.jpg', 'ring.jpg'],
  'couple-bands': ['ring.jpg', 'gold-detail.jpg'],
  earrings: ['earrings.jpg', 'hero-gold.jpg'],
  necklaces: ['necklace.jpg', 'campaign.jpg'],
  pendants: ['necklace.jpg', 'hero-gold.jpg'],
  bracelets: ['gold-detail.jpg', 'campaign.jpg'],
  bangles: ['gold-detail.jpg', 'hero-gold.jpg'],
  chains: ['necklace.jpg', 'gold-detail.jpg'],
  mangalsutra: ['necklace.jpg', 'campaign.jpg'],
  'nose-pins': ['hero-gold.jpg', 'earrings.jpg'],
  'jewellery-sets': ['campaign.jpg', 'necklace.jpg'],
  bride: ['campaign.jpg', 'necklace.jpg', 'earrings.jpg'],
};

// name, price (Rs). Fully original product names.
const TYPES = [
  {
    name: 'Rings', slug: 'rings', sizes: ['6', '7', '8', '9', '10', '12'], metal: '18kt gold with natural diamonds',
    blurb: 'An everyday-luxe ring set with sparkling diamonds, finished by hand and made to be worn daily.',
    products: [
      ['Aurora Halo Diamond Ring', 38999], ['Petal Cluster Diamond Ring', 27499], ['Slim Stackable Gold Ring', 9499],
      ['Crown Marquise Cocktail Ring', 54999], ['Twin Leaf Diamond Ring', 18999], ['Infinity Knot Gold Ring', 12999],
      ['Starlit Pavé Band Ring', 22999], ['Heritage Blue Sapphire Ring', 46999],
    ],
  },
  {
    name: 'Solitaires', slug: 'solitaires', sizes: ['6', '7', '8', '9', '10'], metal: '18kt gold with an IGI-certified solitaire',
    blurb: 'A single brilliant-cut solitaire in a timeless setting, certified and delivered in a keepsake box.',
    products: [
      ['Classic Four-Prong Solitaire', 64999], ['Royal Crown Solitaire Ring', 89999], ['Oval Bloom Solitaire', 72999],
      ['Cushion Glow Solitaire', 78999], ['Emerald Step Solitaire', 96999], ['Pear Drop Solitaire Ring', 69999],
      ['Rose Gold Solitaire Band', 58999], ['Eternal Hidden Halo Solitaire', 124999],
    ],
  },
  {
    name: 'Couple Bands', slug: 'couple-bands', sizes: ['6', '7', '8', '9', '10', '11'], metal: '18kt gold with natural diamonds',
    blurb: 'A matching pair for two. Smooth comfort-fit bands with a hint of sparkle.',
    products: [
      ['Forever Together Band Pair', 42999], ['Simple Promise Band Pair', 24999], ['Twin Diamond Edge Pair', 36999],
      ['Rose & Yellow Gold Pair', 31999], ['Matte Finish Gold Pair', 28499], ['Mini Pavé Couple Bands', 39999],
      ['Engraved Vow Bands', 26499], ['Royal Link Couple Bands', 47999],
    ],
  },
  {
    name: 'Earrings', slug: 'earrings', sizes: [], metal: '18kt gold with natural diamonds',
    blurb: 'Light, comfortable earrings that go from a morning meeting to an evening out.',
    products: [
      ['Everyday Diamond Studs', 14999], ['Mini Flower Studs', 1499], ['Gold Huggie Hoops', 6999],
      ['Teardrop Diamond Danglers', 17999], ['Chandbali Pearl Earrings', 11999], ['Solitaire Screw-Back Studs', 21999],
      ['Starburst Drop Earrings', 12499], ['Classic Gold Jhumkas', 9999],
    ],
  },
  {
    name: 'Necklaces', slug: 'necklaces', sizes: [], metal: '18kt gold with natural diamonds',
    blurb: 'A statement necklace that sits beautifully and layers well with what you already own.',
    products: [
      ['Cascade Diamond Necklace', 54999], ['Floral Heritage Gold Necklace', 67999], ['Delicate Station Necklace', 18999],
      ['Rani Haar Choker', 82999], ['Twin Strand Gold Necklace', 29999], ['Pearl Drop Diamond Necklace', 42999],
      ['Minimal Bar Necklace', 8999], ['Temple Motif Gold Necklace', 74999],
    ],
  },
  {
    name: 'Pendants', slug: 'pendants', sizes: [], metal: '18kt gold with natural diamonds, chain included',
    blurb: 'A small pendant with a big story — comes with a matching gold chain.',
    products: [
      ['Teardrop Solitaire Pendant', 15999], ['Tiny Heart Gold Pendant', 1799], ['Evil-Eye Diamond Pendant', 7499],
      ['Initial Letter Pendant', 4999], ['Lotus Bloom Pendant', 11999], ['Infinity Diamond Pendant', 8999],
      ['Tree of Life Pendant', 6499], ['Star Cluster Pendant', 2499],
    ],
  },
  {
    name: 'Bracelets', slug: 'bracelets', sizes: ['S', 'M', 'L'], metal: '18kt gold with natural diamonds',
    blurb: 'A comfortable bracelet with a secure clasp, made for all-day wear.',
    products: [
      ['Classic Diamond Tennis Bracelet', 48999], ['Gold Link Chain Bracelet', 16999], ['Mini Evil-Eye Bracelet', 3999],
      ['Floral Station Bracelet', 22999], ['Bar & Bead Gold Bracelet', 12499], ['Kids Charm Gold Bracelet', 4499],
      ['Gents Curb Gold Bracelet', 34999], ['Pearl & Gold Bracelet', 9999],
    ],
  },
  {
    name: 'Bangles', slug: 'bangles', sizes: ['2.2', '2.4', '2.6', '2.8'], metal: '22kt hallmarked gold',
    blurb: 'A hallmarked gold bangle with a smooth finish, comfortable to wear stacked or alone.',
    products: [
      ['Traditional Gold Kada', 58999], ['Slim Everyday Bangle', 17999], ['Diamond-Cut Gold Bangles (Pair)', 64999],
      ['Floral Engraved Bangle', 36999], ['Antique Finish Kangan', 44999], ['Openable Screw Bangle', 29999],
      ['Daily Wear Twisted Bangle', 14999], ['Bridal Gold Bangle Set of 4', 124999],
    ],
  },
  {
    name: 'Chains', slug: 'chains', sizes: ['16"', '18"', '20"', '22"'], metal: '22kt hallmarked gold',
    blurb: 'A strong, hallmarked gold chain that holds a pendant well and feels light on the neck.',
    products: [
      ['Rope Gold Chain', 19999], ['Box Link Gold Chain', 24999], ['Fine Singapore Chain', 8999],
      ['Figaro Gold Chain', 27999], ['Kids Mini Gold Chain', 4999], ['Curb Link Chain', 22499],
      ['Cable Gold Chain', 12999], ['Daily Wear Light Chain', 1999],
    ],
  },
  {
    name: 'Mangalsutra', slug: 'mangalsutra', sizes: ['16"', '18"', '20"', '30"'], metal: '18kt gold with natural diamonds and black beads',
    blurb: 'A modern mangalsutra that you can actually wear every day, with traditional black beads.',
    products: [
      ['Diamond Pendant Mangalsutra', 32999], ['Short Everyday Mangalsutra', 12999], ['Double Layer Mangalsutra', 41999],
      ['Floral Bead Mangalsutra', 19999], ['Classic Long Mangalsutra', 52999], ['Mini Diamond Mangalsutra Bracelet', 7499],
      ['Heart Motif Mangalsutra', 15999], ['Gold Vati Mangalsutra', 27499],
    ],
  },
  {
    name: 'Nose Pins', slug: 'nose-pins', sizes: [], metal: '18kt gold, push-back finish',
    blurb: 'A tiny, comfortable nose pin with a secure back, easy to wear all day.',
    products: [
      ['Mini Diamond Nose Pin', 4499], ['Gold Dot Nose Pin', 799], ['Flower Nose Stud', 1299],
      ['Pearl Nose Pin', 899], ['Twin Stone Nose Pin', 2499], ['Tiny Leaf Nose Pin', 949],
      ['Solitaire Nose Stud', 3999], ['Gold Nath Nose Ring', 1799],
    ],
  },
  {
    name: 'Jewellery Sets', slug: 'jewellery-sets', sizes: [], metal: '18kt gold with natural diamonds',
    blurb: 'A matching necklace and earrings set, ready to gift and ready to wear.',
    products: [
      ['Bridal Diamond Necklace Set', 149999], ['Festive Gold Haar Set', 112999], ['Everyday Pendant & Stud Set', 14999],
      ['Floral Choker Set', 84999], ['Pearl & Gold Set', 38999], ['Temple Motif Gold Set', 96999],
      ['Mini Heart Gift Set', 5999], ['Bridal Kundan-Style Gold Set', 129999],
    ],
  },
  {
    name: 'Bride', slug: 'bride', sizes: [], metal: '22kt hallmarked gold with kundan, polki and uncut stones',
    blurb: 'A lavish bridal heirloom set with layered silhouettes, intricate hand-finished details and statement-making traditional craftsmanship.',
    products: [
      ['Rajwadi Heavy Kundan Bridal Haar Set', 289999], ['Temple Gold Bridal Choker with Rani Haar', 349999],
      ['Polki Bridal Necklace Set with Matha Patti', 425999], ['Antique Gold Bridal Jadau Choker Set', 319999],
      ['Meenakari Rani Haar Bridal Set with Jhumkas', 379999], ['Uncut Polki Bridal Satlada Haar Set', 499999],
      ['Heritage Bridal Jewellery Set with Nath', 459999], ['Grand Kundan Bridal Choker and Long Haar', 389999],
    ],
  },
];
// ─────────────────────────────────────────────────────────────────────────

const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i;
const stockUrl = (file) => `${IMAGE_BASE}/jewelry/${file}`;

// photos for one type: your https URLs -> your photos in public/products/<type> -> public/products/all -> stock
const photosFor = (slug) => {
  if (IMAGE_URLS[slug]?.length) return IMAGE_URLS[slug];
  for (const folder of [slug, 'all']) {
    const dir = path.join(PUBLIC_DIR, 'products', folder);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => IMG_EXT.test(f)).sort();
      if (files.length) return files.map((f) => `${IMAGE_BASE}/products/${folder}/${encodeURIComponent(f)}`);
    }
  }
  return STOCK[slug].map(stockUrl);
};

const skuFor = (t, i) => `OR-${t.slug.replace(/[^a-z]/g, '').slice(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;

const run = async () => {
  await connectDB();
  try {
    const selectedTypes = process.argv.includes('--bride-only')
      ? TYPES.filter((type) => type.slug === 'bride')
      : TYPES;
    if (process.argv.includes('--clean')) {
      const r = await Product.deleteMany({ sku: /^OR-/ });
      console.log(`🧹 Removed ${r.deletedCount} old OR-* products`);
    }

    // ── 1. Category + subcategories (each with its own photo) ────────────
    const photos = Object.fromEntries(selectedTypes.map((t) => [t.slug, photosFor(t.slug)]));
    const typeImages = Object.fromEntries(selectedTypes.map((t) => [t.name, photos[t.slug][0]]));

    let category = await Category.findOne({
      $or: [{ slug: CATEGORY.slug }, { name: new RegExp(`^${CATEGORY.name}$`, 'i') }],
    });
    if (!category) {
      category = new Category({ name: CATEGORY.name, slug: CATEGORY.slug, types: [] });
      console.log(`＋ Created category "${CATEGORY.name}"`);
    }
    const slug = category.slug;
    const have = new Set(category.types.map((x) => x.toLowerCase()));
    TYPES.forEach((t) => { if (!have.has(t.name.toLowerCase())) category.types.push(t.name); });
    category.image = category.image || stockUrl(CATEGORY.image);
    category.typeImages = { ...Object.fromEntries(category.typeImages || []), ...typeImages };
    category.isActive = true;
    category.showInNavbar = true;
    category.showOnHomepage = true;
    await category.save();
    console.log(`✔ Category "${category.name}" ready → ${category.types.length} subcategories with photos`);

    // ── 2. Products ──────────────────────────────────────────────────────
    const owner = await User.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
    if (!owner) console.log('ℹ No admin user found — run `npm run seed` first if you want products owned by an admin.');

    // round-robin over types so the newest products are a mix of everything
    const maxLen = Math.max(...selectedTypes.map((t) => t.products.length));
    const flat = [];
    for (let i = 0; i < maxLen; i++) selectedTypes.forEach((t) => { if (t.products[i]) flat.push({ t, i, spec: t.products[i] }); });

    let created = 0;
    let updated = 0;
    for (let n = 0; n < flat.length; n++) {
      const { t, i, spec } = flat[n];
      const [name, price] = spec;
      const pool = photos[t.slug];
      // each product gets its own main photo (rotating through the pool) + one more angle
      const images = [pool[(i) % pool.length], pool[(i + 1) % pool.length]].filter((v, k, a) => a.indexOf(v) === k);

      const originalPrice = Math.round((price * (1.12 + ((n * 3) % 5) / 50)) / 10) * 10; // ~12–22% off
      const flash = n % 9 === 4; // a few flash-sale products
      const sku = skuFor(t, i);
      const doc = {
        name,
        description: `${name} — ${t.blurb} Made in ${t.metal}. Comes in a gift-ready box with a purity certificate and lifetime exchange.`,
        price,
        originalPrice,
        discount: Math.round(((originalPrice - price) / originalPrice) * 100),
        category: slug,
        subCategory: t.name,
        productType: t.name,
        brand: BRAND,
        images,
        sizes: t.sizes,
        colors: ['Yellow Gold', 'Rose Gold', 'White Gold'].slice(0, t.slug === 'bangles' || t.slug === 'chains' ? 1 : 3),
        stock: 10 + ((n * 7) % 40),
        sku,
        tags: ['jewellery', 'diamond', 'gold', t.name.toLowerCase(), i % 2 ? 'gift' : 'bestseller'],
        isFeatured: n % 4 === 0,
        isFlashSale: flash,
        ratings: Math.round((4 + ((n * 7) % 10) / 10) * 10) / 10,
        numReviews: 12 + ((n * 37) % 240),
        weight: 2 + (n % 9),
        isActive: true,
        approvalStatus: 'approved',
        sellerId: null,
        ownerAdmin: owner ? owner._id : null,
      };
      if (flash) {
        doc.flashSalePrice = Math.round(price * 0.85);
        doc.flashSaleEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }

      const existing = await Product.findOne({ sku });
      if (existing) {
        await Product.updateOne({ _id: existing._id }, { $set: doc });
        updated++;
      } else {
        await Product.create(doc); // created one by one so "Just arrived" ordering is mixed
        created++;
      }
    }

    console.log('\n================ ✅ HOME PRODUCTS SEED COMPLETE ================');
    console.log(`Products: ${created} created, ${updated} refreshed  (${flat.length} total)`);
    console.log(`Subcategories: ${selectedTypes.map((t) => t.name).join(', ')}`);
    const customPhotos = selectedTypes.filter((t) => !IMAGE_URLS[t.slug] && fs.existsSync(path.join(PUBLIC_DIR, 'products', t.slug))).map((t) => t.slug);
    console.log(customPhotos.length
      ? `Your own photos used for: ${customPhotos.join(', ')}`
      : 'Using the 6 stock photos. Add your own in frontend/public/products/<type>/ and run with --clean for unique photos.');
    console.log('Reload the home page.');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('❌ Home products seeder error:', err);
  } finally {
    process.exit();
  }
};

run();