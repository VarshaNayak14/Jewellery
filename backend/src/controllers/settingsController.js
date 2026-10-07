const SiteSettings = require('../models/SiteSettings');

// ADMIN: Get settings
exports.getSettings = async (req, res) => {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  res.json({ success: true, settings });
};

// ADMIN: Update settings
exports.updateSettings = async (req, res) => {
  // The admin form echoes back the whole settings document, including its
  // Mongoose bookkeeping fields. Assigning a stale __v onto the document makes
  // the next save fail with a VersionError, so never let those through.
  const { _id, __v, createdAt, updatedAt, ...updates } = req.body;
  if (req.user.role !== 'superadmin') delete updates.instagramPosts;
  if (updates.instagramPosts !== undefined && !Array.isArray(updates.instagramPosts)) {
    return res.status(400).json({ success: false, message: 'Instagram posts must be a list of URLs.' });
  }
  if (Array.isArray(updates.instagramPosts)) {
    if (updates.instagramPosts.length > 12 || updates.instagramPosts.some((post) => (
      typeof post?.url !== 'string'
      || !/^https?:\/\/(?:www\.)?instagram\.com\/(?:(?:p|reel|tv)\/[A-Za-z0-9_-]+|(?!(?:accounts|about|developer|direct|explore|legal|p|reel|reels|stories|tv|web)(?:\/|$))[A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i.test(post.url.trim())
    ))) {
      return res.status(400).json({ success: false, message: 'Add up to 12 valid Instagram profile, post, or Reel links.' });
    }
    updates.instagramPosts = updates.instagramPosts.map((post) => ({
      url: post.url.trim(),
      enabled: post.enabled !== false,
    }));
  }

  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  res.json({ success: true, settings });
};

// PUBLIC: Only the handful of fields safe to expose to every visitor (no
// payment keys, SMTP creds, etc.) — used by the Navbar's scrolling marquee
// and similar public-facing bits so they're editable from Admin Settings
// instead of being hardcoded in the frontend.
exports.getPublicSettings = async (req, res) => {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  res.json({
    success: true,
    settings: {
      siteName: settings.siteName,
      logo: settings.logo,
      lightLogo: settings.lightLogo,
      darkLogo: settings.darkLogo,
      favicon: settings.favicon,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      requireSellerKycForProducts: settings.requireSellerKycForProducts,
      whatsappNumber: settings.whatsappNumber,
      address: settings.address,
      footerDescription: settings.footerDescription,
      footerColumns: settings.footerColumns,
      footerSocialLinks: settings.footerSocialLinks,
      marqueeMessages: settings.marqueeMessages,
      homepageSections: settings.homepageSections,
      signupPopup: settings.signupPopup,
      instagramPosts: (settings.instagramPosts || []).filter((post) => post.enabled),
    },
  });
};

// PUBLIC: The Super Admin's saved bank/UPI/QR details — shown to a
// prospective seller on the "Become a Seller" payment step, right after they
// pick a plan, so they know where to send the plan fee. Deliberately kept
// separate from getPublicSettings (which is cached/used site-wide) and never
// includes razorpayKeySecret. razorpayKeyId is safe to expose — it's a public
// identifier the Razorpay Checkout widget needs in the browser.
exports.getPaymentDetails = async (req, res) => {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  res.json({
    success: true,
    paymentDetails: {
      upiId: settings.upiId,
      qrCode: settings.qrCode,
      bankDetails: settings.bankDetails,
      razorpayEnabled: Boolean(settings.razorpayKeyId && settings.razorpayKeySecret),
      // Bank/QR transfer is offered only once Super Admin has filled in at
      // least a QR, UPI ID or bank account for sellers to pay into.
      bankTransferEnabled: Boolean(settings.qrCode || settings.upiId || settings.bankDetails?.accountNumber),
      razorpayKeyId: settings.razorpayKeyId || '',
    },
  });
};
// ── Legal pages (Privacy Policy, Terms & Conditions) ─────────────────────────
// Created from the default text on first read, so the footer links work
// right away; Admin / Super Admin edit them from Settings → Legal Pages.
const LegalPage = require('../models/LegalPage');
const { LEGAL_DEFAULTS } = require('../utils/legalDefaults');

const findOrCreateLegalPage = async (slug) => {
  if (!LEGAL_DEFAULTS[slug]) return null;
  let page = await LegalPage.findOne({ slug });
  if (!page) page = await LegalPage.create({ slug, ...LEGAL_DEFAULTS[slug] });
  return page;
};

// GET /api/v1/settings/pages/:slug — public
exports.getLegalPage = async (req, res) => {
  const page = await findOrCreateLegalPage(req.params.slug);
  if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
  res.json({ success: true, page: { slug: page.slug, title: page.title, summary: page.summary, content: page.content, items: page.items, updatedAt: page.updatedAt } });
};

// PUT /api/v1/settings/pages/:slug  { title, summary, content, reset? }
exports.updateLegalPage = async (req, res) => {
  const page = await findOrCreateLegalPage(req.params.slug);
  if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
  if (req.body.reset) {
    Object.assign(page, { items: [], ...LEGAL_DEFAULTS[page.slug] });
  } else {
    const { title, summary, content, items } = req.body;
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ success: false, message: 'Title is required' });
      page.title = String(title).trim().slice(0, 120);
    }
    if (summary !== undefined) page.summary = String(summary).trim().slice(0, 300);
    if (content !== undefined) {
      if (String(content).length > 100000) return res.status(400).json({ success: false, message: 'Content is too long' });
      page.content = String(content);
    }
    if (items !== undefined && page.slug === 'faq') {
      if (!Array.isArray(items) || items.length > 300) return res.status(400).json({ success: false, message: 'Invalid FAQ list' });
      const clean = items.map(i => ({
        category: String(i?.category || 'General').trim().slice(0, 60) || 'General',
        question: String(i?.question || '').trim().slice(0, 300),
        answer: String(i?.answer || '').trim().slice(0, 5000),
      }));
      if (clean.some(i => !i.question)) return res.status(400).json({ success: false, message: 'Every FAQ needs a question' });
      page.items = clean;
    }
  }
  page.updatedBy = req.user._id;
  await page.save();
  res.json({ success: true, page });
};
