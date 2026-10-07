const Offer = require('../models/Offer');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { sellerCaps } = require('../utils/planCapabilities');
const Seller = require('../models/Seller');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const { addDuration } = require('../utils/subscription');

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const parseDiscountPercent = (value) => {
  const percent = value === undefined || value === null || value === '' ? 0 : Number(value);
  return Number.isFinite(percent) && percent >= 0 && percent <= 95 ? percent : null;
};
const hasOfferPlan = (seller) => Boolean(
  seller?.offerPlanSnapshot &&
  (!seller.offerPlanExpiresAt || new Date(seller.offerPlanExpiresAt).getTime() > Date.now())
);
const hasSellerPlan = (seller) => Boolean(
  seller?.planSnapshot?.name &&
  (!seller.planExpiresAt || new Date(seller.planExpiresAt).getTime() > Date.now())
);
const hasLegacyFestivalContent = (offer) => Boolean(
  offer.tag || offer.description || offer.discountText
);
const normalizeOfferPlacement = (offer) => ({
  ...offer,
  placement: offer.placement || (hasLegacyFestivalContent(offer) ? 'festival' : 'homepage'),
});
const placementFilter = (placement) => {
  if (placement === 'festival') {
    return {
      $or: [
        { placement: 'festival' },
        {
          placement: { $in: [null, ''] },
          $or: [{ tag: { $nin: [null, ''] } }, { description: { $nin: [null, ''] } }, { discountText: { $nin: [null, ''] } }],
        },
      ],
    };
  }
  if (placement === 'homepage') {
    return {
      $or: [
        { placement: 'homepage' },
        {
          placement: { $in: [null, ''] },
          $and: [{ tag: { $in: [null, ''] } }, { description: { $in: [null, ''] } }, { discountText: { $in: [null, ''] } }],
        },
      ],
    };
  }
  return {};
};

// Banners allowed by the seller's offer plan: those created since the plan
// started, except rejected ones (deleting a banner frees its slot).
async function offerPlanQuota(seller) {
  if (!hasOfferPlan(seller)) return { limit: 0, used: 0, available: false };
  const limit = seller.offerPlanSnapshot?.bannerLimit ?? -1;
  const since = seller.offerPlanStartedAt || new Date(Date.now() - YEAR_MS);
  const used = await Offer.countDocuments({ seller: seller._id, createdAt: { $gte: since }, status: { $ne: 'rejected' } });
  return { limit, used, available: limit === -1 || used < limit };
}

// Promotional banners included in the seller's own plan (e.g. Silver: 1 per
// year) — usable without buying a separate offer plan.
async function freeBannerQuota(seller) {
  const perYear = sellerCaps(seller).promoBannersPerYear;
  if (!hasSellerPlan(seller) || perYear === 0) return { perYear: 0, used: 0, available: false };
  if (perYear === -1) return { perYear, used: 0, available: true };
  const used = await Offer.countDocuments({ seller: seller._id, createdAt: { $gte: new Date(Date.now() - YEAR_MS) } });
  return { perYear, used, available: used < perYear };
}

// Turns on the flash-sale price on each of a seller's own products for this
// offer's discount — reuses the existing isFlashSale/flashSalePrice fields
// (same ones FlashSaleSection/ProductCard already know how to render) so the
// discount shows up everywhere the product does, not just on the banner.
async function applyOfferDiscount(sellerId, productIds, discountPercent) {
  if (!productIds?.length || !discountPercent) return;
  const filter = { _id: { $in: productIds } };
  if (sellerId) filter.sellerId = sellerId;
  const products = await Product.find(filter);
  await Promise.all(products.map(p => {
    p.isFlashSale = true;
    p.flashSalePrice = Math.round(p.price * (1 - discountPercent / 100));
    return p.save();
  }));
}

// Turns the flash-sale price back off for a set of products — used when an
// offer's product list/discount changes or the offer is deleted.
async function revertOfferDiscount(productIds) {
  if (!productIds?.length) return;
  await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { isFlashSale: false }, $unset: { flashSalePrice: '' } }
  );
}

// ── Public ───────────────────────────────────────────────────────────────
// Shown on the main marketplace homepage — only offers an Admin/SuperAdmin
// has approved, newest first.
exports.getApprovedOffers = async (req, res) => {
  const offers = await Offer.find({ status: 'approved', ...placementFilter(req.query.placement) })
    .sort('-reviewedAt')
    .populate('seller', 'shopName shopSlug')
    .lean();
  res.json({ success: true, offers: offers.map(normalizeOfferPlacement) });
};

// ── Seller ───────────────────────────────────────────────────────────────
// A seller's own storefront always shows ALL of their own offers regardless
// of status — approval only gates whether it also appears on the shared
// marketplace homepage.
exports.getSellerPublicOffers = async (req, res) => {
  const offers = await Offer.find({ seller: req.params.sellerId }).sort('-createdAt').lean();
  res.json({ success: true, offers: offers.map(normalizeOfferPlacement) });
};

exports.getMyOffers = async (req, res) => {
  const hasActivePlan = Boolean(
    req.seller?.offerPlanSnapshot &&
    (!req.seller.offerPlanExpiresAt || new Date(req.seller.offerPlanExpiresAt).getTime() > Date.now())
  );

  if (!hasActivePlan) {
    return res.json({ success: true, offers: [] });
  }

  const offers = (await Offer.find({ seller: req.seller._id }).sort('-createdAt').lean()).map(normalizeOfferPlacement);
  const quota = await offerPlanQuota(req.seller);
  res.json({ success: true, offers, bannerQuota: { limit: quota.limit, used: quota.used } });
};

exports.createOffer = async (req, res) => {
  // A banner is allowed by the offer plan's limit, or else by the banners
  // included free in the seller plan.
  const [planQuota, freeQuota] = await Promise.all([offerPlanQuota(req.seller), freeBannerQuota(req.seller)]);
  if (!planQuota.available && !freeQuota.available) {
    let message = 'You need an active offer plan before creating homepage offers. Choose and pay for a plan first.';
    if (hasOfferPlan(req.seller)) {
      message = `Your ${req.seller.offerPlanSnapshot.name} offer plan allows ${planQuota.limit} homepage banner${planQuota.limit === 1 ? '' : 's'} and you have used all of them. Delete an old banner or upgrade your offer plan.`;
    } else if (freeQuota.perYear > 0) {
      message = `Your plan includes ${freeQuota.perYear} promotional banner(s) per year and you've used them. Buy an offer plan to create more.`;
    }
    return res.status(403).json({ success: false, message });
  }

  const { tag, title, description, discountText, image, link, colorFrom, colorTo, products, discountPercent } = req.body;
  const placement = req.body.placement === 'festival' ? 'festival' : 'homepage';
  if ((placement === 'festival' && (typeof title !== 'string' || !title.trim()))
    || (typeof image !== 'string' || !image.trim())) {
    return res.status(400).json({ success: false, message: placement === 'festival' ? 'Title and image are required' : 'Image is required' });
  }

  // Only ever discount products this seller actually owns.
  if (products !== undefined && !Array.isArray(products)) {
    return res.status(400).json({ success: false, message: 'Selected products must be a list' });
  }
  if (products?.some((id) => !/^[a-f\d]{24}$/i.test(String(id)))) {
    return res.status(400).json({ success: false, message: 'One or more selected products are invalid' });
  }
  const validProducts = products?.length
    ? (await Product.find({ _id: { $in: products }, sellerId: req.seller._id }, '_id')).map(p => p._id)
    : [];

  const numericDiscount = parseDiscountPercent(discountPercent);
  if (numericDiscount === null) {
    return res.status(400).json({ success: false, message: 'Discount must be between 0 and 95 percent' });
  }
  if (validProducts.length && numericDiscount === 0) {
    return res.status(400).json({ success: false, message: 'Set a discount percentage for selected products' });
  }

  const offer = await Offer.create({
    seller: req.seller._id,
    placement,
    tag: placement === 'festival' ? tag : '',
    title: placement === 'festival' ? title : 'Homepage image',
    description: placement === 'festival' ? description : '',
    discountText: placement === 'festival' ? discountText : '',
    image,
    link: placement === 'festival' ? link : '',
    colorFrom: colorFrom || 'from-blue-600',
    colorTo: colorTo || 'to-blue-700',
    products: validProducts,
    discountPercent: numericDiscount,
    status: 'pending',
  });

  await applyOfferDiscount(req.seller._id, validProducts, numericDiscount);

  await Notification.create({
    title: 'New Offer Submitted',
    message: `${req.seller.shopName} submitted a new ${placement} offer for approval.`,
    type: 'push',
    targetRole: 'admin',
  });

  res.status(201).json({ success: true, offer });
};

exports.updateOffer = async (req, res) => {
  // Editing an existing banner is allowed with an offer plan, or with a seller
  // plan that includes promotional banners.
  const canManage = hasOfferPlan(req.seller)
    || (hasSellerPlan(req.seller) && sellerCaps(req.seller).promoBannersPerYear !== 0);

  if (!canManage) {
    return res.status(403).json({
      success: false,
      message: 'Your active plan is required to manage homepage offers.',
    });
  }

  const offer = await Offer.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

  const { tag, title, description, discountText, image, link, colorFrom, colorTo, products, discountPercent } = req.body;
  if (req.body.placement !== undefined) {
    if (!['homepage', 'festival'].includes(req.body.placement)) {
      return res.status(400).json({ success: false, message: 'Invalid offer placement' });
    }
    offer.placement = req.body.placement;
  }
  if (tag !== undefined) offer.tag = tag;
  if (title !== undefined) offer.title = title;
  if (description !== undefined) offer.description = description;
  if (discountText !== undefined) offer.discountText = discountText;
  if (image !== undefined) offer.image = image;
  if (link !== undefined) offer.link = link;
  if (colorFrom !== undefined) offer.colorFrom = colorFrom;
  if (colorTo !== undefined) offer.colorTo = colorTo;

  // Product list / discount % changing means the old discount no longer
  // applies as-is — revert it on the previous products, then re-apply fresh
  // on whatever the new selection + percent turn out to be.
  const productsOrDiscountChanged = products !== undefined || discountPercent !== undefined;
  const oldProductIds = offer.products;

  if (products !== undefined) {
    if (!Array.isArray(products) || products.some((id) => !/^[a-f\d]{24}$/i.test(String(id)))) {
      return res.status(400).json({ success: false, message: 'Selected products must be a list of valid product IDs' });
    }
    const validProducts = products.length
      ? (await Product.find({ _id: { $in: products }, sellerId: req.seller._id }, '_id')).map(p => p._id)
      : [];
    offer.products = validProducts;
  }
  if (discountPercent !== undefined) {
    const numericDiscount = parseDiscountPercent(discountPercent);
    if (numericDiscount === null) {
      return res.status(400).json({ success: false, message: 'Discount must be between 0 and 95 percent' });
    }
    offer.discountPercent = numericDiscount;
  }
  if (offer.products.length && offer.discountPercent === 0) {
    return res.status(400).json({ success: false, message: 'Set a discount percentage for selected products' });
  }

  // Editing a reviewed offer sends it back to pending — an approved offer's
  // content shouldn't change on the main homepage without a fresh look.
  if (offer.status !== 'pending') {
    offer.status = 'pending';
    offer.rejectionReason = '';
    offer.reviewedBy = undefined;
    offer.reviewedAt = undefined;
  }

  await offer.save();

  if (productsOrDiscountChanged) {
    await revertOfferDiscount(oldProductIds);
    await applyOfferDiscount(req.seller._id, offer.products, offer.discountPercent);
  }

  res.json({ success: true, offer });
};

exports.deleteOffer = async (req, res) => {
  const hasActivePlan = Boolean(
    req.seller?.planSnapshot &&
    (!req.seller.planExpiresAt || new Date(req.seller.planExpiresAt).getTime() > Date.now())
  );

  if (!hasActivePlan) {
    return res.status(403).json({
      success: false,
      message: 'Your active plan is required to manage homepage offers.',
    });
  }

  const placement = req.query.placement;
  if (!['homepage', 'festival'].includes(placement)) {
    return res.status(400).json({ success: false, message: 'Offer placement is required' });
  }
  const offer = await Offer.findOneAndDelete({
    _id: req.params.id,
    seller: req.seller._id,
    ...placementFilter(placement),
  });
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
  await revertOfferDiscount(offer.products);
  res.json({ success: true, message: 'Offer deleted' });
};

// ── Admin / SuperAdmin ───────────────────────────────────────────────────
exports.getPendingOffers = async (req, res) => {
  const offers = await Offer.find({ status: 'pending' })
    .sort('-createdAt')
    .populate('seller', 'shopName shopSlug logo');
  res.json({ success: true, offers });
};

exports.getAllOffersAdmin = async (req, res) => {
  const { status, placement } = req.query;
  const filter = status ? { status } : {};
  Object.assign(filter, placementFilter(placement));
  const offers = await Offer.find(filter)
    .sort('-createdAt')
    .populate('seller', 'shopName shopSlug logo phone city state planSnapshot.name offerPlan offerPlanSnapshot offerPlanStartedAt offerPlanExpiresAt')
    .populate('products', 'name images price')
    .populate('createdBy', 'name role')
    .lean();
  res.json({ success: true, offers: offers.map(normalizeOfferPlacement) });
};

exports.getOfferProductsAdmin = async (req, res) => {
  const { search = '' } = req.query;
  const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = escapedSearch ? { name: { $regex: escapedSearch, $options: 'i' } } : {};
  const products = await Product.find(filter)
    .select('name images variants price sellerId')
    .sort('-createdAt')
    .limit(100)
    .lean();
  res.json({ success: true, products });
};

exports.reviewOffer = async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be "approved" or "rejected"' });
  }

  const offer = await Offer.findById(req.params.id).populate('seller', 'shopName user');
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

  offer.status = status;
  offer.rejectionReason = status === 'rejected' ? (rejectionReason || '') : '';
  offer.reviewedBy = req.user._id;
  offer.reviewedAt = new Date();
  await offer.save();

  if (offer.seller?.user) await Notification.create({
    title: status === 'approved' ? 'Offer Approved' : 'Offer Rejected',
    message: status === 'approved'
      ? `Your offer "${offer.title}" is now live on the growthkarts homepage.`
      : `Your offer "${offer.title}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
    type: 'push',
    targetRole: 'seller',
    targetUser: offer.seller.user,
  });

  res.json({ success: true, offer });
};

// ── Platform banners (Admin / Super Admin) ───────────────────────────────
// Added straight to the homepage — no seller, no plan, approved at once.
const BANNER_FIELDS = ['placement', 'tag', 'title', 'description', 'discountText', 'image', 'link', 'colorFrom', 'colorTo', 'products', 'discountPercent'];
const pickBanner = (body) => Object.fromEntries(BANNER_FIELDS.filter(k => body[k] !== undefined).map(k => [k, typeof body[k] === 'string' ? body[k].trim() : body[k]]));

// POST /api/v1/offers/admin
exports.createPlatformOffer = async (req, res) => {
  const data = pickBanner(req.body);
  data.placement = data.placement === 'festival' ? 'festival' : 'homepage';
  if (typeof data.image !== 'string' || !data.image.trim()
    || (data.placement === 'festival' && (typeof data.title !== 'string' || !data.title.trim()))) {
    return res.status(400).json({ success: false, message: data.placement === 'festival' ? 'Title and image are required' : 'Image is required' });
  }
  data.discountPercent = parseDiscountPercent(data.discountPercent);
  if (data.discountPercent === null) {
    return res.status(400).json({ success: false, message: 'Discount must be between 0 and 95 percent' });
  }
  if (data.products !== undefined && !Array.isArray(data.products)) {
    return res.status(400).json({ success: false, message: 'Selected products must be a list' });
  }
  const productIds = Array.isArray(data.products) ? [...new Set(data.products.map(String))] : [];
  if (productIds.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    return res.status(400).json({ success: false, message: 'One or more selected products are invalid' });
  }
  const validProducts = productIds.length
    ? await Product.find({ _id: { $in: productIds } }, '_id').then((items) => items.map((item) => item._id))
    : [];
  if (validProducts.length !== productIds.length) {
    return res.status(400).json({ success: false, message: 'One or more selected products could not be found' });
  }
  if (validProducts.length && data.discountPercent === 0) {
    return res.status(400).json({ success: false, message: 'Set a discount percentage for selected products' });
  }
  data.products = validProducts;
  if (data.placement === 'homepage') {
    data.title = 'Homepage image';
    data.tag = '';
    data.description = '';
    data.discountText = '';
    data.link = '';
  }
  const offer = await Offer.create({
    ...data,
    colorFrom: data.colorFrom || 'from-blue-600',
    colorTo: data.colorTo || 'to-blue-700',
    createdBy: req.user._id,
    status: 'approved',
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  });
  await applyOfferDiscount(null, validProducts, data.discountPercent);
  res.status(201).json({ success: true, offer });
};

// PUT /api/v1/offers/admin/:id — platform banners only
exports.updatePlatformOffer = async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, seller: null });
  if (!offer) return res.status(404).json({ success: false, message: 'Banner not found' });
  const data = pickBanner(req.body);
  if (data.discountPercent !== undefined) {
    data.discountPercent = parseDiscountPercent(data.discountPercent);
    if (data.discountPercent === null) {
      return res.status(400).json({ success: false, message: 'Discount must be between 0 and 95 percent' });
    }
  }
  if (data.products !== undefined) {
    if (!Array.isArray(data.products)) {
      return res.status(400).json({ success: false, message: 'Selected products must be a list' });
    }
    const productIds = Array.isArray(data.products) ? [...new Set(data.products.map(String))] : [];
    if (productIds.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
      return res.status(400).json({ success: false, message: 'One or more selected products are invalid' });
    }
    const validProducts = productIds.length
      ? await Product.find({ _id: { $in: productIds } }, '_id').then((items) => items.map((item) => item._id))
      : [];
    if (validProducts.length !== productIds.length) {
      return res.status(400).json({ success: false, message: 'One or more selected products could not be found' });
    }
    data.products = validProducts;
  }
  const previousProductIds = offer.products;
  Object.assign(offer, data);
  if (data.placement !== undefined && !['homepage', 'festival'].includes(data.placement)) {
    return res.status(400).json({ success: false, message: 'Invalid offer placement' });
  }
  if (!offer.image || (offer.placement === 'festival' && !offer.title)) {
    return res.status(400).json({ success: false, message: offer.placement === 'festival' ? 'Title and image are required' : 'Image is required' });
  }
  if (offer.products.length && offer.discountPercent === 0) {
    return res.status(400).json({ success: false, message: 'Set a discount percentage for selected products' });
  }
  if (offer.placement === 'homepage') {
    offer.title = 'Homepage image';
    offer.tag = '';
    offer.description = '';
    offer.discountText = '';
    offer.link = '';
  }
  await offer.save();
  if (data.products !== undefined || data.discountPercent !== undefined) {
    await revertOfferDiscount(previousProductIds);
    await applyOfferDiscount(null, offer.products, offer.discountPercent);
  }
  res.json({ success: true, offer });
};

// DELETE /api/v1/offers/admin/:id — platform banners only
exports.deletePlatformOffer = async (req, res) => {
  const placement = req.query.placement;
  if (!['homepage', 'festival'].includes(placement)) {
    return res.status(400).json({ success: false, message: 'Offer placement is required' });
  }
  const offer = await Offer.findOneAndDelete({
    _id: req.params.id,
    seller: null,
    ...placementFilter(placement),
  });
  if (!offer) return res.status(404).json({ success: false, message: 'Banner not found' });
  await revertOfferDiscount(offer.products);
  res.json({ success: true, message: 'Banner deleted' });
};

// PUT /api/v1/offers/sellers/:sellerId/offer-plan  { planId }
// Admin / Super Admin gives a seller a homepage banner plan without payment
// (e.g. paid offline or a free promotion). Starts today, runs for the plan's
// duration, recorded in Subscription Payments as an admin assignment.
exports.assignOfferPlan = async (req, res) => {
  const [seller, plan] = await Promise.all([
    Seller.findById(req.params.sellerId),
    SubscriptionPlan.findOne({ _id: req.body.planId, purpose: 'offer' }),
  ]);
  if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
  if (!plan) return res.status(400).json({ success: false, message: 'Choose a homepage banner plan' });

  const startedAt = new Date();
  const expiresAt = addDuration(startedAt, plan);
  seller.offerPlan = plan._id;
  seller.offerPlanSnapshot = { name: plan.name, price: plan.price, bannerLimit: plan.bannerLimit ?? -1 };
  seller.offerPlanStartedAt = startedAt;
  seller.offerPlanExpiresAt = expiresAt;
  await seller.save();

  await SubscriptionPayment.create({
    seller: seller._id, plan: plan._id, planName: plan.name, amount: 0,
    purpose: 'offer', status: 'paid', paymentMethod: 'admin_assignment',
    transactionId: `assigned-by-${req.user._id}`, purchasedAt: startedAt, expiresAt,
  });
  if (seller.user) {
    await Notification.create({
      title: 'Homepage banner plan assigned',
      message: `You have been given the ${plan.name} plan — ${plan.bannerLimit > 0 ? `${plan.bannerLimit} homepage banner(s)` : 'unlimited homepage banners'} until ${expiresAt.toLocaleDateString('en-IN')}.`,
      type: 'push',
      targetUser: seller.user,
    });
  }
  res.json({
    success: true,
    message: `${plan.name} assigned to ${seller.shopName}`,
    seller: { _id: seller._id, offerPlan: seller.offerPlan, offerPlanSnapshot: seller.offerPlanSnapshot, offerPlanStartedAt: startedAt, offerPlanExpiresAt: expiresAt },
  });
};
