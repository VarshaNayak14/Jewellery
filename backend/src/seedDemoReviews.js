const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Review = require('./models/Review');
const User = require('./models/User');

const DEMO_EMAIL = 'homepage-demo-reviews@growthkarts.invalid';
const REVIEW_COPY = [
  {
    title: 'A beautiful finishing touch',
    comment: 'The detailing looks lovely and the piece feels special enough to wear for a celebration.',
  },
  {
    title: 'Even prettier in person',
    comment: 'The design has a lovely shine and feels comfortable. It paired beautifully with my festive outfit.',
  },
  {
    title: 'A memorable gift',
    comment: 'A thoughtful design with elegant details. It made a lovely gift for a special occasion.',
  },
  {
    title: 'Graceful and timeless',
    comment: 'The craftsmanship and finish stand out. I can see myself wearing this for years.',
  },
  {
    title: 'Lovely details',
    comment: 'The product looks just as graceful as I hoped. The small details make it feel extra special.',
  },
];

async function seedDemoReviews() {
  await connectDB();

  let demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (process.argv.includes('--remove')) {
    if (!demoUser) {
      console.log('No demo review user or reviews found.');
      return;
    }
    const productIds = await Review.find({ user: demoUser._id, isDemo: true }).distinct('product');
    const { deletedCount } = await Review.deleteMany({ user: demoUser._id, isDemo: true });
    await Promise.all(productIds.map((productId) => Review.calcAverageRating(productId)));
    await User.deleteOne({ _id: demoUser._id });
    console.log(`Removed ${deletedCount} demo reviews and the dedicated demo account.`);
    return;
  }

  if (!demoUser) {
    demoUser = await User.create({
      name: 'Demo Customer',
      email: DEMO_EMAIL,
      password: crypto.randomBytes(32).toString('hex'),
      role: 'user',
    });
  }

  const products = await Product.find({
    isActive: true,
    approvalStatus: 'approved',
    $or: [{ sellerId: null }, { sellerId: { $exists: false } }],
    images: { $exists: true, $ne: [] },
  }).sort('-createdAt').limit(REVIEW_COPY.length).select('_id name');

  if (!products.length) throw new Error('No active products with images found to attach demo reviews to.');

  for (const [index, product] of products.entries()) {
    const copy = REVIEW_COPY[index % REVIEW_COPY.length];
    await Review.findOneAndUpdate(
      { user: demoUser._id, product: product._id, isDemo: true },
      {
        $set: {
          rating: 5,
          title: copy.title,
          comment: copy.comment,
          images: [],
          videos: [],
          isVerifiedPurchase: false,
          isDemo: true,
          isHidden: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await Review.calcAverageRating(product._id);
    console.log(`Seeded demo review: ${product.name}`);
  }

  console.log(`Done. ${products.length} demo reviews are visibly labeled on the homepage.`);
}

seedDemoReviews()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Failed to seed demo reviews:', error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
