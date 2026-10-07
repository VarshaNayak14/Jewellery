const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Offer = require('./models/Offer');

const TAG = 'JEWELLERY COLLECTION';
const BANNERS = [
  { title: 'Timeless Gold Elegance', image: '/jewelry/banner.png', link: '/shop?category=jewellery' },
  { title: 'Bridal Jewellery Edit', image: '/jewelry/banner1.png', link: '/shop?category=jewellery' },
  { title: 'Diamond Celebration', image: '/jewelry/banner2.png', link: '/shop?category=jewellery' },
  { title: 'The Heirloom Collection', image: '/jewelry/campaign.jpg', link: '/shop?category=jewellery' },
  { title: 'Everyday Jewellery', image: '/jewelry/necklace.jpg', link: '/shop?category=jewellery' },
];

async function seedHomepageBanners() {
  await connectDB();

  for (const banner of BANNERS) {
    const offer = await Offer.findOneAndUpdate(
      { seller: { $exists: false }, tag: TAG, title: banner.title },
      {
        $set: {
          ...banner,
          tag: TAG,
          description: '',
          discountText: '',
          colorFrom: 'from-pink-500',
          colorTo: 'to-fuchsia-600',
          status: 'approved',
          reviewedAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    console.log(`Seeded ${offer.title}`);
  }
}

seedHomepageBanners()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Failed to seed homepage banners:', error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
