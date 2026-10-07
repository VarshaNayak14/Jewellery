const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('./config/db');
const Blog = require('./models/Blog');
const User = require('./models/User');

/**
 * Adds three sample jewellery articles (skips any whose slug already exists).
 *   cd backend && node src/seedBlogs.js
 */
const IMAGE_BASE = (process.env.SEED_IMAGE_BASE || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const img = (file) => `${IMAGE_BASE}/jewelry/${file}`;

const POSTS = [
  {
    slug: 'gold-purity-explained-24k-22k-18k',
    title: '24K, 22K or 18K? Gold purity, explained simply',
    category: 'Gold Guide',
    tags: ['gold', 'purity', 'hallmark'],
    isFeatured: true,
    coverImage: img('hero-gold.jpg'),
    excerpt: 'What karat really means, why most Indian jewellery is 22K, and how to check purity before you pay.',
    content: `Karat tells you how much of a piece is pure gold. 24 parts make the whole, so **24K is 99.9% gold**, while 22K is 91.6% and 18K is 75%.

## Why most jewellery is 22K
Pure gold is beautiful but soft — it bends and scratches easily. Mixing in a little copper or silver makes it strong enough to wear every day while keeping that rich yellow colour.

- **24K** — coins and bars, rarely jewellery
- **22K** — traditional necklaces, bangles and bridal sets
- **18K** — diamond and gemstone settings that need to hold stones tightly
- **14K** — light, durable everyday pieces

## How to check purity
Every hallmarked piece carries the BIS logo, the purity grade (like 22K916) and a six-character **HUID** code. You can verify the HUID in the BIS Care app before you buy.

> Always ask for an invoice that lists the net weight, purity and making charges separately.

## Reading the price
Jewellery price = gold weight × today's rate + making charges + stones + 3% GST. Our product pages show this breakup for every live-priced piece.`,
  },
  {
    slug: 'choosing-your-bridal-jewellery-set',
    title: 'Choosing your bridal jewellery: a calm, step-by-step guide',
    category: 'Bridal',
    tags: ['bridal', 'wedding', 'kundan'],
    coverImage: img('necklace.jpg'),
    excerpt: 'From the neckline of your outfit to heirloom value — how to pick bridal pieces you will love long after the wedding.',
    content: `Bridal jewellery is the one purchase most families plan for years. A little structure makes it far less overwhelming.

## Start with the outfit
Your neckline decides the necklace. A deep or sweetheart neckline suits a layered rani haar; a high neck pairs better with a choker and long earrings.

## Pick one hero piece
Choose the piece people will remember — usually the necklace — and keep the rest supporting it rather than competing with it.

1. Necklace or choker
2. Earrings that balance it
3. Maang tikka and bangles
4. A ring you can wear every day afterwards

## Think beyond the day
Kundan and polki look regal on the day; plain 22K gold pieces are easier to wear again and hold resale value. Many brides mix both.

> Book a showroom visit two to three months ahead so there is time for sizing and custom work.`,
  },
  {
    slug: 'how-to-care-for-gold-and-diamond-jewellery',
    title: 'How to care for gold and diamond jewellery at home',
    category: 'Jewellery Care',
    tags: ['care', 'cleaning', 'diamond'],
    coverImage: img('ring.jpg'),
    excerpt: 'Simple habits that keep your pieces bright — and the few things you should never do.',
    content: `A few small habits keep your jewellery looking new for decades.

## Everyday habits
- Put jewellery on **after** perfume, lotion and hairspray
- Take rings off before cooking, cleaning or the gym
- Store each piece separately in a soft pouch so they don't scratch each other

## Cleaning at home
Soak gold or diamond pieces in warm water with a drop of mild dish soap for 15 minutes. Brush gently with a soft toothbrush, rinse, and pat dry with a lint-free cloth.

## What to avoid
Never use toothpaste, bleach or chlorine — they dull gold and can loosen stone settings. Pearls and emeralds need only a soft damp cloth.

> Have prongs and clasps checked by your jeweller once a year — it's usually free.`,
  },
];

(async () => {
  await connectDB();
  try {
    const author = await User.findOne({ role: { $in: ['superadmin', 'admin'] } }).sort({ createdAt: 1 });
    let created = 0;
    for (const post of POSTS) {
      // eslint-disable-next-line no-await-in-loop
      if (await Blog.exists({ slug: post.slug })) continue;
      // eslint-disable-next-line no-await-in-loop
      await Blog.create({ ...post, status: 'published', author: author?._id, authorName: author?.name || 'Editorial Team' });
      created++;
    }
    console.log(`✔ Blogs seeded: ${created} created, ${POSTS.length - created} already existed`);
  } catch (err) {
    console.error('❌ Blog seeder error:', err);
  } finally {
    process.exit();
  }
})();
