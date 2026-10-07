const mongoose = require('mongoose');
const Product = require('./Product');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  comment: { type: String },
  images: [{ type: String }],
  videos: [{ type: String }],
  // Users who marked this review "Helpful" (one vote each). Never sent to the
  // client as-is — the API exposes helpfulCount / isHelpful instead.
  helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isVerifiedPurchase: { type: Boolean, default: false },
  isDemo: { type: Boolean, default: false },
  sellerReply: { type: String },
  isHidden: { type: Boolean, default: false },
  // Admin-picked for the homepage "Loved by you" testimonials.
  isFeatured: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// Compound index for faster lookup (not unique to avoid migration issues)
reviewSchema.index({ product: 1, user: 1 });

// Recalculate product average rating and review count
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isHidden: { $ne: true } } },
    { $group: { _id: '$product', nRatings: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, { ratings: stats[0].avgRating, numReviews: stats[0].nRatings });
  } else {
    await Product.findByIdAndUpdate(productId, { ratings: 0, numReviews: 0 });
  }
};

module.exports = mongoose.model('Review', reviewSchema);
