const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Seller = require('./models/Seller');
const User = require('./models/User');
const { normalizeCapabilities } = require('./utils/planCapabilities');

const EMAIL = 'seller@demo.com';
const PASSWORD = process.env.DEMO_SELLER_PASSWORD;
const FRONTEND_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const JEWELLERY_TYPES = [
  'Rings', 'Solitaires', 'Couple Bands', 'Earrings', 'Necklaces', 'Pendants',
  'Bracelets', 'Bangles', 'Chains', 'Mangalsutra', 'Nose Pins', 'Jewellery Sets',
];
const PHOTO_SETS = {
  ring: ['ring.jpg', 'hero-gold.jpg'],
  solitaire: ['ring.jpg', 'gold-detail.jpg'],
  couple: ['ring.jpg', 'necklace.jpg'],
  earrings: ['earrings.jpg', 'hero-gold.jpg'],
  necklace: ['necklace.jpg', 'campaign.jpg'],
  pendant: ['gold-detail.jpg', 'necklace.jpg'],
  bracelet: ['gold-detail.jpg', 'earrings.jpg'],
  bangles: ['gold-detail.jpg', 'hero-gold.jpg'],
  chain: ['necklace.jpg', 'gold-detail.jpg'],
  mangalsutra: ['necklace.jpg', 'campaign.jpg'],
  nose: ['hero-gold.jpg', 'earrings.jpg'],
  bridal: ['campaign.jpg', 'necklace.jpg'],
};

const PRODUCTS = [
  ['Aurora Halo Diamond Ring', 'Rings', 38999, 'ring', '18kt Gold', 3.2],
  ['Petal Cluster Diamond Ring', 'Rings', 27499, 'ring', '18kt Gold', 2.8],
  ['Slim Stackable Gold Ring', 'Rings', 9499, 'ring', '18kt Gold', 1.7],
  ['Classic Four-Prong Solitaire', 'Solitaires', 64999, 'solitaire', '18kt Gold', 3.5],
  ['Forever Together Band Pair', 'Couple Bands', 42999, 'couple', '18kt Gold', 5.1],
  ['Everyday Diamond Studs', 'Earrings', 14999, 'earrings', '18kt Gold', 2.1],
  ['Chandbali Pearl Earrings', 'Earrings', 11999, 'earrings', '18kt Gold', 2.4],
  ['Cascade Diamond Necklace', 'Necklaces', 54999, 'necklace', '18kt Gold', 7.2],
  ['Delicate Station Necklace', 'Necklaces', 18999, 'necklace', '18kt Gold', 4.3],
  ['Teardrop Solitaire Pendant', 'Pendants', 15999, 'pendant', '18kt Gold', 2.2],
  ['Lotus Bloom Pendant', 'Pendants', 11999, 'pendant', '18kt Gold', 1.9],
  ['Classic Diamond Tennis Bracelet', 'Bracelets', 48999, 'bracelet', '18kt Gold', 6.1],
  ['Gold Link Chain Bracelet', 'Bracelets', 16999, 'bracelet', '18kt Gold', 3.4],
  ['Traditional Gold Kada', 'Bangles', 58999, 'bangles', '22kt Gold', 8.5],
  ['Floral Engraved Bangle', 'Bangles', 36999, 'bangles', '22kt Gold', 5.8],
  ['Rope Gold Chain', 'Chains', 19999, 'chain', '22kt Gold', 4.2],
  ['Diamond Pendant Mangalsutra', 'Mangalsutra', 32999, 'mangalsutra', '18kt Gold', 5.3],
  ['Mini Diamond Nose Pin', 'Nose Pins', 4499, 'nose', '18kt Gold', 0.5],
  ['Pearl & Gold Set', 'Jewellery Sets', 38999, 'bridal', '18kt Gold', 6.8],
  ['Rajwadi Kundan Bridal Haar Set', 'Jewellery Sets', 129999, 'bridal', '22kt Gold', 18.5],
];

const imageUrl = (filename) => `${FRONTEND_URL}/jewelry/${filename}`;

async function run() {
  if (!PASSWORD || PASSWORD.length < 6) {
    throw new Error('Set DEMO_SELLER_PASSWORD to a password with at least 6 characters before seeding.');
  }

  await connectDB();
  try {
    let user = await User.findOne({ email: EMAIL }).select('+password');
    if (!user) {
      user = new User({ name: 'Aurelle Demo Seller', email: EMAIL, password: PASSWORD, role: 'seller' });
    } else {
      user.name = 'Aurelle Demo Seller';
      user.role = 'seller';
      user.isActive = true;
      user.password = PASSWORD;
    }
    await user.save();

    let category = await Category.findOne({ slug: 'jewellery' });
    if (!category) {
      category = new Category({
        name: 'Jewellery',
        slug: 'jewellery',
        types: JEWELLERY_TYPES,
        image: imageUrl('campaign.jpg'),
        isActive: true,
        showInNavbar: true,
        showOnHomepage: true,
      });
    } else {
      category.types = Array.from(new Set([...(category.types || []), ...JEWELLERY_TYPES]));
      category.isActive = true;
    }
    await category.save();

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const storeData = {
      shopName: 'Aurelle Fine Jewellery',
      description: 'Discover thoughtfully designed gold and diamond jewellery for everyday elegance, celebrations and bridal moments. Explore rings, necklaces, earrings and handcrafted heirloom-inspired sets.',
      category: category.name,
      subCategories: JEWELLERY_TYPES,
      city: 'Mumbai',
      tehsil: 'Mumbai',
      district: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      address: 'Online showroom · Mumbai, Maharashtra',
      footerEmail: EMAIL,
      logo: `${FRONTEND_URL}/logo1.png`,
      banner: imageUrl('campaign.jpg'),
      bannerType: 'image',
      theme: 'minimal',
      themeColor: '#8e6a36',
      specialities: ['Gold Jewellery', 'Diamond Jewellery', 'Bridal Jewellery', 'Everyday Wear'],
      yearEstablished: 2020,
      gallery: ['campaign.jpg', 'necklace.jpg', 'earrings.jpg', 'gold-detail.jpg'].map(imageUrl),
      amenities: ['Online Store', 'Gift Packaging', 'Customer Support'],
      workingHours: {
        mon: '10:00 AM - 7:00 PM',
        tue: '10:00 AM - 7:00 PM',
        wed: '10:00 AM - 7:00 PM',
        thu: '10:00 AM - 7:00 PM',
        fri: '10:00 AM - 7:00 PM',
        sat: '10:00 AM - 7:00 PM',
        sun: 'Closed',
      },
      footerColumns: [
        { heading: 'Shop', subheading: 'Explore Aurelle', links: [{ label: 'All Jewellery', url: '/shop' }, { label: 'Rings', url: '/shop?category=jewellery&subCategory=Rings' }, { label: 'Bridal Jewellery', url: '/shop?category=jewellery&subCategory=Jewellery%20Sets' }] },
        { heading: 'Customer Care', subheading: 'Here to help', links: [{ label: 'Contact', url: '/contact' }, { label: 'Shipping & Returns', url: '/shipping-returns' }] },
      ],
      footerSocialLinks: [],
      legalPages: {
        privacyPolicy: 'Aurelle Demo Store respects your privacy. This demo storefront does not collect or process real customer information.',
        termsAndConditions: 'This is a demo storefront. Product details and prices are sample data for demonstration purposes.',
      },
      status: 'approved',
      isVerified: false,
      paymentVerified: false,
      'kyc.status': 'not_submitted',
      planSnapshot: {
        name: 'Demo Store',
        price: 0,
        productLimit: 50,
        visibilityScope: 'india',
        capabilities: normalizeCapabilities({ storefront: true, directPayment: false, contactButtons: false, premiumThemes: true }),
      },
      planPurchasedAt: now,
      planExpiresAt: expiresAt,
    };
    let seller = await Seller.findOne({ user: user._id });
    if (!seller) seller = new Seller({ user: user._id, ...storeData });
    else seller.set(storeData);
    await seller.save();

    let created = 0;
    let updated = 0;
    for (let index = 0; index < PRODUCTS.length; index += 1) {
      const [name, subCategory, price, photoSet, purity, grossWeight] = PRODUCTS[index];
      const originalPrice = Math.round(price * 1.18 / 100) * 100;
      const photoFiles = PHOTO_SETS[photoSet];
      const sku = `AURELLE-DEMO-${String(index + 1).padStart(2, '0')}`;
      const productData = {
        name,
        description: `${name}, designed for lasting style and carefully finished for a refined look. Sample item from the Aurelle Fine Jewellery demo collection.`,
        price,
        originalPrice,
        discount: Math.round(((originalPrice - price) / originalPrice) * 100),
        category: category.slug,
        subCategory,
        productType: subCategory,
        brand: 'Aurelle Fine Jewellery',
        images: photoFiles.map(imageUrl),
        stock: 8 + ((index * 7) % 32),
        codAvailable: true,
        returnAvailable: true,
        returnDays: 7,
        refundAvailable: true,
        refundDays: 7,
        sku,
        tags: ['jewellery', 'demo', subCategory.toLowerCase(), 'gift'],
        isFeatured: index < 4,
        isFlashSale: false,
        isActive: true,
        approvalStatus: 'approved',
        sellerId: seller._id,
        jewellery: {
          metal: 'gold',
          purity,
          grossWeight,
          netWeight: grossWeight,
          makingChargeType: 'fixed',
          makingCharge: 0,
          gstPercent: 3,
          pricingMode: 'fixed',
          hallmarked: false,
          gender: 'women',
          occasion: subCategory === 'Jewellery Sets' ? 'Wedding' : 'Everyday',
        },
      };

      const existing = await Product.findOne({ sku });
      if (existing && String(existing.sellerId) !== String(seller._id)) {
        throw new Error(`SKU collision for ${sku}; refusing to modify a product owned by another seller.`);
      }
      if (existing) {
        existing.set(productData);
        await existing.save();
        updated += 1;
      } else {
        await Product.create(productData);
        created += 1;
      }
    }

    console.log(JSON.stringify({
      sellerEmail: EMAIL,
      shop: seller.shopName,
      shopSlug: seller.shopSlug,
      productsCreated: created,
      productsUpdated: updated,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(`Demo seller seed failed: ${error.message}`);
  process.exitCode = 1;
});
