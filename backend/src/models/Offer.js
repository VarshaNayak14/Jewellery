const mongoose = require('mongoose');

// Promotional banner cards. Sellers create them for their own storefront (a
// seller's storefront always shows all of their offers; the main homepage only
// the approved ones). Admin / Super Admin can also add platform banners
// straight to the homepage — those have no seller and are approved at once.
const offerSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who added a platform banner
  placement: { type: String, enum: ['homepage', 'festival'], default: 'homepage', index: true },
  tag: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  discountText: { type: String, trim: true, default: '' },
  image: { type: String, required: true },
  link: { type: String, trim: true, default: '' },
  // Optional: tie the banner to specific products of this seller's own and
  // apply a real discount to them (via the existing flash-sale mechanism —
  // see offerController for the apply/revert logic), so a shopper who clicks
  // through actually finds the advertised price, not just a banner.
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  discountPercent: { type: Number, min: 0, max: 95, default: 0 },
  colorFrom: { type: String, default: 'from-blue-600' },
  colorTo: { type: String, default: 'to-blue-700' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
