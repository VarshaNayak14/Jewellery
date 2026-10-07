const Review = require('../models/Review');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const Order = require('../models/Order');
const { rankScoreOf } = require('../utils/sellerRanking');

// Rolls a seller's product-review ratings up into Seller.avgRating/numRatings
// — the trust signal shown on the business directory (BusinessProfile,
// search/sort by rating). Product.ratings/numReviews are per-product; this
// aggregates across every product the seller owns.
async function recalcSellerRating(sellerId) {
  if (!sellerId) return;
  const productIds = await Product.find({ sellerId }, '_id').distinct('_id');
  const stats = await Review.aggregate([
    { $match: { product: { $in: productIds }, isHidden: { $ne: true } } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats[0]?.avgRating || 0;
  const numRatings = stats[0]?.count || 0;
  await Seller.findByIdAndUpdate(sellerId, { avgRating, numRatings, rankScore: rankScoreOf(avgRating, numRatings) });
}

// A review is only allowed once the reviewer actually has a delivered order
// containing this product — whether that order was placed on the main site
// (admin-catalog items) or on a seller's own storefront (seller-listed items
// bought there also create a real Order via the storefront checkout; only
// products contacted purely over Call/WhatsApp with no storefront purchase
// have nothing to verify against).
async function hasDeliveredOrder(userId, productId) {
  return Order.exists({ user: userId, isDelivered: true, 'items.product': productId });
}

// USER: Check whether the current user can review a product — lets the
// frontend show "Write a review" vs "Buy this product to review it" vs
// "You've already reviewed this" without a failed POST round-trip.
exports.canReviewProduct = async (req, res) => {
  const alreadyReviewed = await Review.exists({ user: req.user._id, product: req.params.productId });
  if (alreadyReviewed) return res.json({ success: true, canReview: false, reason: 'already_reviewed' });

  const purchased = await hasDeliveredOrder(req.user._id, req.params.productId);
  if (!purchased) return res.json({ success: true, canReview: false, reason: 'not_purchased' });

  res.json({ success: true, canReview: true });
};

// USER: Find one delivered-but-unreviewed product to prompt the customer
// about — powers the auto "Rate your order" popup shown after login. Picks
// the most recently delivered item first so the prompt is always about
// something they'll actually remember getting.
exports.getPendingReview = async (req, res) => {
  const orders = await Order.find({ user: req.user._id, isDelivered: true })
    .sort('-deliveredAt')
    .select('items deliveredAt');

  const reviewedIds = new Set(
    (await Review.find({ user: req.user._id }).distinct('product')).map(String)
  );

  for (const order of orders) {
    for (const item of order.items) {
      const productId = item.product?.toString();
      if (productId && !reviewedIds.has(productId)) {
        return res.json({
          success: true,
          pending: { productId, name: item.name, image: item.image },
        });
      }
    }
  }

  res.json({ success: true, pending: null });
};

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_VIDEOS = 2;

// Review media is uploaded through our own /upload/review-media endpoint, so
// only accept URLs from our Cloudinary account — anything else (e.g. a
// "javascript:" link) would end up in an href/src on the product page.
const cleanMediaUrls = (urls, max) => {
  if (!Array.isArray(urls)) return [];
  const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
  return [...new Set(urls.filter((u) => typeof u === 'string' && u.startsWith(prefix)))].slice(0, max);
};

// USER: Create review — requires a delivered order for this exact product.
exports.createReview = async (req, res) => {
  const { productId, rating, title, comment, images, videos } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });

  const purchased = await hasDeliveredOrder(req.user._id, productId);
  if (!purchased) {
    return res.status(403).json({ success: false, message: 'You can only review a product after it has been delivered to you' });
  }

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    rating,
    title,
    comment,
    images: cleanMediaUrls(images, MAX_REVIEW_IMAGES),
    videos: cleanMediaUrls(videos, MAX_REVIEW_VIDEOS),
    isVerifiedPurchase: true,
  });

  await Review.calcAverageRating(productId);
  await recalcSellerRating(product.sellerId);
  await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, review: toClientReview(review, req.user._id) });
};

// Public shape of a review: the raw list of voters stays server-side, the
// client gets the vote count and whether the current viewer has voted.
const toClientReview = (review, userId) => {
  const { helpfulBy = [], ...rest } = review.toObject();
  return {
    ...rest,
    helpfulCount: helpfulBy.length,
    isHelpful: Boolean(userId) && helpfulBy.some((id) => id.equals(userId)),
  };
};

// PUBLIC: Recent customer testimonials for the homepage, with hidden reviews
// excluded and just enough product/user data for an image-led review card.
// Order: admin-featured first, then reviews with video, then photos, then
// the best-rated text reviews. Only 4★+ reviews make it to the homepage.
exports.getFeaturedReviews = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 16);
  const ranked = await Review.aggregate([
    { $match: { isHidden: { $ne: true }, rating: { $gte: 4 }, $or: [{ comment: { $nin: [null, ''] } }, { title: { $nin: [null, ''] } }] } },
    { $addFields: {
      _hasVideo: { $gt: [{ $size: { $ifNull: ['$videos', []] } }, 0] },
      _hasImage: { $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] },
    } },
    { $sort: { isFeatured: -1, _hasVideo: -1, _hasImage: -1, rating: -1, createdAt: -1 } },
    { $limit: limit },
    { $project: { _id: 1 } },
  ]);
  const ids = ranked.map((r) => r._id);
  const docs = await Review.find({ _id: { $in: ids } })
    .populate('user', 'name avatar')
    .populate('product', 'name images');
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const reviews = ids.map((id) => byId.get(String(id))).filter((r) => r && r.product);

  const [stats] = await Review.aggregate([
    { $match: { isHidden: { $ne: true } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, total: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    reviews: reviews.map((review) => toClientReview(review, req.user?._id)),
    summary: { average: stats ? Math.round(stats.avg * 10) / 10 : 0, total: stats?.total || 0 },
  });
};

// ADMIN: pin / unpin a review on the homepage testimonials.
exports.toggleReviewFeatured = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  review.isFeatured = !review.isFeatured;
  await review.save();
  res.json({ success: true, isFeatured: review.isFeatured, message: review.isFeatured ? 'Shown on homepage' : 'Removed from homepage' });
};

// PUBLIC: Get reviews for a product (hidden reviews are moderated out).
// Sends a token-aware `isHelpful` flag when the viewer is logged in.
exports.getProductReviews = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const filter = { product: req.params.productId, isHidden: { $ne: true } };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name avatar'),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, reviews: reviews.map((r) => toClientReview(r, req.user?._id)), total });
};

// USER: Mark a review helpful / remove that mark (one vote per user).
exports.toggleHelpful = async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, isHidden: { $ne: true } }).select('helpfulBy');
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

  const alreadyVoted = review.helpfulBy.some((id) => id.equals(req.user._id));
  const updated = await Review.findByIdAndUpdate(
    review._id,
    alreadyVoted ? { $pull: { helpfulBy: req.user._id } } : { $addToSet: { helpfulBy: req.user._id } },
    { new: true }
  ).select('helpfulBy');

  res.json({ success: true, helpfulCount: updated.helpfulBy.length, isHelpful: !alreadyVoted });
};

// USER: Get my reviews
exports.getMyReviews = async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .sort('-createdAt')
    .populate('product', 'name images');
  res.json({ success: true, reviews });
};

// SELLER: Get reviews for seller's products
exports.getSellerProductReviews = async (req, res) => {
  const products = await Product.find({ sellerId: req.seller._id }, '_id');
  const productIds = products.map(p => p._id);
  const reviews = await Review.find({ product: { $in: productIds } })
    .sort('-createdAt')
    .populate('user', 'name avatar')
    .populate('product', 'name images');
  res.json({ success: true, reviews });
};

// SELLER: Reply to review (add reply as update)
exports.replyToReview = async (req, res) => {
  const review = await Review.findById(req.params.id).populate('product');
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  if (review.product.sellerId?.toString() !== req.seller._id.toString())
    return res.status(403).json({ success: false, message: 'Not authorized' });
  review.sellerReply = req.body.reply;
  await review.save();
  res.json({ success: true, review });
};

// ADMIN: Get all reviews
exports.getAllReviews = async (req, res) => {
  const { page = 1, limit = 20, from, to } = req.query;
  const query = {};
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reviews, total] = await Promise.all([
    Review.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('user', 'name email')
      .populate('product', 'name'),
    Review.countDocuments(query),
  ]);
  res.json({ success: true, reviews, total });
};

// ADMIN: Delete review
exports.deleteReview = async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  await Review.calcAverageRating(review.product);
  const product = await Product.findById(review.product, 'sellerId');
  await recalcSellerRating(product?.sellerId);
  res.json({ success: true, message: 'Review deleted' });
};

// ADMIN: Hide/unhide review
exports.toggleReviewVisibility = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  review.isHidden = !review.isHidden;
  await review.save();
  await Review.calcAverageRating(review.product);
  const product = await Product.findById(review.product, 'sellerId');
  await recalcSellerRating(product?.sellerId);
  res.json({ success: true, review });
};
