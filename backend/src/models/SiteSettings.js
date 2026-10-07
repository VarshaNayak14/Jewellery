const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'growthkarts' },
  logo: { type: String, default: '' },
  lightLogo: { type: String, default: '' },
  darkLogo: { type: String, default: '' },
  favicon: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  // Number for the floating WhatsApp button on the main website (falls back to contactPhone).
  whatsappNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  // Short "about us" text under the logo in the website footer.
  footerDescription: { type: String, default: '' },
  footerColumns: {
    type: [{
      heading: { type: String, trim: true, default: '' },
      subheading: { type: String, trim: true, default: '' },
      links: [{ label: { type: String, trim: true }, url: { type: String, trim: true } }],
    }],
    default: [],
  },
  footerSocialLinks: {
    type: [{ platform: { type: String, trim: true }, url: { type: String, trim: true } }],
    default: [],
  },
  instagramPosts: {
    type: [{
      url: { type: String, trim: true, required: true },
      enabled: { type: Boolean, default: true },
    }],
    default: [],
  },
  // Payment
  codEnabled: { type: Boolean, default: true },
  requireSellerKycForProducts: { type: Boolean, default: true },
  razorpayKeyId: { type: String, default: '' },
  razorpayKeySecret: { type: String, default: '' },
  upiId: { type: String, default: '' },
  // Manual bank-transfer details the Super Admin keeps on file. Shown to a
  // prospective seller on the "Become a Seller" payment step once they've
  // picked a plan, so they know where to send the plan fee. Not included in
  // getPublicSettings (site-wide public settings) — only exposed via the
  // dedicated getPaymentDetails endpoint, which is meant to be opened right
  // at that payment step.
  qrCode: { type: String, default: '' }, // image URL of the UPI/payment QR code
  bankDetails: {
    accountHolderName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
  },
  // Shipping and tax defaults are intentionally zero for a no-extra-charge setup.
  defaultShippingCharge: { type: Number, default: 0 },
  freeShippingThreshold: { type: Number, default: 0 },
  // Tax
  gstPercentage: { type: Number, default: 0 },
  // Seller referral program — one-time bonus paid to a seller when someone
  // they referred signs up, sized as this % of the new seller's plan price.
  // Set by Super Admin (see AdminSettings → General).
  referralCommissionPercent: { type: Number, default: 10, min: 0, max: 100 },
  // SEO
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  // SMTP
  smtpHost: { type: String, default: '' },
  smtpPort: { type: Number, default: 587 },
  smtpUser: { type: String, default: '' },
  smtpPass: { type: String, select: false },
  // First-visit sign-up popup on the storefront (shown once per browser session to
  // logged-out visitors). Editable from Admin Settings → Popup.
  signupPopup: {
    enabled: { type: Boolean, default: true },
    image: { type: String, default: '' },
    title: { type: String, default: 'Your first purchase, made more rewarding' },
    message: { type: String, default: 'Sign up now and unlock member-only offers on your first purchase.' },
    delaySeconds: { type: Number, default: 4, min: 0, max: 120 },
  },
  // Homepage scrolling marquee — shown at the very top of every page.
  // Editable from Admin Settings → Marquee so no code change is needed to
  // update/add/remove a running offer message.
  marqueeMessages: {
    type: [String],
    default: [
      'BIS hallmarked gold · Certified diamonds · Insured shipping across India',
      'Visit a trusted jeweller near you — find showrooms in your city',
    ],
  },
  // Content for three showpiece homepage sections that were previously
  // 100% hardcoded in their components (RecommendedCollections,
  // CircularShowcase, DepthShowcase). Editable from Admin Settings →
  // Homepage. The jewellery highlights carousel copy is managed here too.
  homepageSections: {
    jewelleryHighlights: {
      title: { type: String, default: 'Jewellery Highlights' },
      subtitle: { type: String, default: 'Discover Diamonds that become part of your precious moments.' },
    },
    recommendedCollections: {
      // Show / hide the whole section on the main website.
      enabled: { type: Boolean, default: true },
      badge: { type: String, default: 'Shop Now' },
      title: { type: String, default: 'Most Recommended Collections For You' },
      subtitle: { type: String, default: 'Discover fashion, tech, home essentials and more from trusted sellers in one marketplace.' },
      // Structurally fixed at exactly 3 items — the grid layout depends on it
      // (item 0 is the "big" tile spanning 2 rows).
      items: {
        type: [{ label: String, cta: String, link: String, img: String, big: Boolean }],
        default: [
          {
            label: 'Fashion & Footwear',
            cta: 'Explore fashion',
            link: '/shop',
            img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=85',
            big: true,
          },
          {
            label: 'Tech & Gadgets',
            cta: 'Shop electronics',
            link: '/shop',
            img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=700&q=85',
          },
          {
            label: 'Home & Lifestyle',
            cta: 'Explore more',
            link: '/shop',
            img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=85',
          },
        ],
      },
    },
    circularShowcase: {
      title: { type: String, default: 'Drag Through Our World' },
      subtitle: { type: String, default: 'Scroll, drag, or use the arrow keys — everything bends in 3D.' },
      items: {
        type: [{ image: String, text: String }],
        default: [
          { image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=900&q=80', text: "Men's Fashion" },
          { image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=900&q=80', text: "Women's Fashion" },
          { image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900&q=80', text: 'Kids Fashion' },
          { image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&q=80', text: 'Accessories' },
          { image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80', text: 'Footwear' },
          { image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=80', text: 'Ethnic Wear' },
          { image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80', text: 'Electronics' },
          { image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80', text: 'Home & Lifestyle' },
        ],
      },
    },
    depthShowcase: {
      title: { type: String, default: "This Week's Most-Loved Picks" },
      subtitle: { type: String, default: 'Handpicked pieces our shoppers keep coming back for — drag, scroll, or use the arrow keys to flip through the stack and find your next favorite.' },
      items: {
        type: [{ image: String, alt: String }],
        default: [
          { image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=700&q=80', alt: 'Sneakers' },
          { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=80', alt: 'Watch' },
          { image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=80', alt: 'Sunglasses' },
          { image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=80', alt: 'Handbag' },
          { image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=700&q=80', alt: 'Sneakers on stairs' },
          { image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=700&q=80', alt: 'Accessories flatlay' },
        ],
      },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);