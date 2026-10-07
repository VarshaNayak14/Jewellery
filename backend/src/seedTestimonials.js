const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Review = require('./models/Review');
const User = require('./models/User');

/**
 * Sample testimonials (photo + video) for the homepage "Loved by you" section.
 * They are saved with isDemo: true and the site labels them as samples, so
 * shoppers are never shown made-up reviews as if they were real.
 *
 *   cd backend
 *   npm run seed:testimonials            # add / refresh
 *   npm run seed:testimonials -- --remove  # delete them all before launch
 *
 * Media is served by the React app (frontend/public/jewelry/*). For production
 * set SEED_IMAGE_BASE to where those files live (e.g. your Cloudinary folder).
 */
const BASE = (process.env.SEED_IMAGE_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const media = (file) => `${BASE}/jewelry/${file}`;

const DEMO_DOMAIN = 'sample-testimonials.invalid';

const TESTIMONIALS = [
  { name: 'Ananya S.', rating: 5, video: 'hero.mp4', title: 'Even prettier in person', comment: 'The shine in daylight is unreal. It sits perfectly and feels so light — I have worn it every day since it arrived.' },
  { name: 'Ritika M.', rating: 5, image: 'necklace.jpg', title: 'My wedding favourite', comment: 'Wore this for my sangeet and got compliments all night. The hallmark and certificate gave my parents real peace of mind.' },
  { name: 'Kavya R.', rating: 5, video: 'hero-scroll.mp4', title: 'Packaging felt like a gift', comment: 'Beautiful box, insured delivery and the piece itself is stunning. Exactly what I saw on the site.' },
  { name: 'Neha P.', rating: 5, image: 'earrings.jpg', title: 'Light, elegant, everyday', comment: 'I wanted something I could wear to the office and to dinners. These are delicate but still catch the light beautifully.' },
  { name: 'Priya K.', rating: 4, image: 'ring.jpg', title: 'The sizing was spot on', comment: 'Used the ring size guide and it fits perfectly. The stone has lovely sparkle — the store also helped me over WhatsApp.' },
  { name: 'Sneha A.', rating: 5, image: 'gold-detail.jpg', title: 'Fine detailing', comment: 'The craftsmanship on the gold work is really fine. You can tell it was finished by hand.' },
  { name: 'Meera J.', rating: 5, image: 'hero-gold.jpg', title: 'A gift she loved', comment: 'Bought this for my mother’s anniversary. She hasn’t taken it off since. Thank you for the quick delivery.' },
];

async function run() {
  await connectDB();

  const demoUsers = await User.find({ email: new RegExp(`@${DEMO_DOMAIN.replace('.', '\\.')}$`) }).select('_id');

  if (process.argv.includes('--remove')) {
    const ids = demoUsers.map((u) => u._id);
    const productIds = await Review.find({ user: { $in: ids }, isDemo: true }).distinct('product');
    const { deletedCount } = await Review.deleteMany({ user: { $in: ids }, isDemo: true });
    await Promise.all(productIds.map((p) => Review.calcAverageRating(p)));
    await User.deleteMany({ _id: { $in: ids } });
    console.log(`Removed ${deletedCount} sample testimonials and ${ids.length} sample accounts.`);
    return;
  }

  const products = await Product.find({ isActive: true, approvalStatus: 'approved', images: { $exists: true, $ne: [] } })
    .sort({ 'jewellery.metal': -1, createdAt: -1 })
    .limit(TESTIMONIALS.length)
    .select('_id name');
  if (!products.length) throw new Error('No approved products with images found — run `node src/seedJewellery.js` first.');

  for (const [i, t] of TESTIMONIALS.entries()) {
    const product = products[i % products.length];
    const email = `sample${i + 1}@${DEMO_DOMAIN}`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name: t.name, email, password: crypto.randomBytes(24).toString('hex'), role: 'user' });
    } else if (user.name !== t.name) {
      user.name = t.name;
      await user.save();
    }

    await Review.findOneAndUpdate(
      { user: user._id, isDemo: true },
      {
        $set: {
          product: product._id,
          rating: t.rating,
          title: t.title,
          comment: t.comment,
          images: t.image ? [media(t.image)] : [],
          videos: t.video ? [media(t.video)] : [],
          isVerifiedPurchase: false,
          isDemo: true,
          isHidden: false,
          isFeatured: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await Review.calcAverageRating(product._id);
    console.log(`✔ ${t.video ? 'video' : 'photo'} testimonial · ${t.name} → ${product.name}`);
  }
  console.log(`\nDone — ${TESTIMONIALS.length} sample testimonials (labelled "Sample" on the site).`);
  console.log('Remove before launch:  npm run seed:testimonials -- --remove');
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('Testimonial seeder failed:', err.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
