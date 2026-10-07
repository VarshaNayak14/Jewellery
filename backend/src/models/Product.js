const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  colorName: { type: String, required: true, trim: true },
  colorCode: { type: String, default: '#cccccc', trim: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  stock: { type: Number, default: 0, min: 0 },
  sku: { type: String, trim: true },
  sizes: [{ type: String }],
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { _id: true });

// Jewellery-specific details. With pricingMode 'live' the product price is
// worked out from netWeight × today's metal rate + making + stones + GST
// (see utils/jewelleryPricing.js) and refreshed whenever rates change.
const jewellerySchema = new mongoose.Schema({
  metal: { type: String, enum: ['gold', 'rose-gold', 'white-gold', 'silver', 'platinum', 'other', ''], default: '' },
  purity: { type: String, trim: true, default: '' },
  grossWeight: { type: Number, min: 0 },
  netWeight: { type: Number, min: 0 },
  stoneWeight: { type: Number, min: 0 }, // carats
  gemstone: { type: String, trim: true, default: '' },
  diamondClarity: { type: String, trim: true, default: '' },
  diamondColor: { type: String, trim: true, default: '' },
  stoneCharges: { type: Number, default: 0, min: 0 },
  makingChargeType: { type: String, enum: ['percent', 'per_gram', 'fixed'], default: 'percent' },
  makingCharge: { type: Number, default: 0, min: 0 },
  gstPercent: { type: Number, default: 3, min: 0 },
  pricingMode: { type: String, enum: ['fixed', 'live'], default: 'fixed' },
  hallmarked: { type: Boolean, default: false },
  huid: { type: String, trim: true, uppercase: true, default: '' },
  certification: { type: String, trim: true, default: '' },
  certificateUrl: { type: String, trim: true, default: '' },
  gender: { type: String, enum: ['women', 'men', 'kids', 'unisex', ''], default: '' },
  occasion: { type: String, trim: true, default: '' },
  priceBreakup: {
    rateUsed: Number,
    metalValue: Number,
    makingCharges: Number,
    stoneCharges: Number,
    gst: Number,
    total: Number,
    computedAt: Date,
  },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  deliveryCharge: { type: Number, default: 0, min: 0 },
  originalPrice: { type: Number },
  discount: { type: Number, default: 0 },
  category: { type: String, required: true },
  subCategory: { type: String },
  productType: { type: String },
  brand: { type: String, default: 'growthkarts' },
  images: [{ type: String }],
  videos: [{ type: String }],
  colorImages: { type: Map, of: [String], default: {} },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  stock: { type: Number, default: 0 },
  codAvailable: { type: Boolean, default: true },
  returnAvailable: { type: Boolean, default: true },
  returnDays: { type: Number, default: 7, min: 0 },
  refundAvailable: { type: Boolean, default: true },
  refundDays: { type: Number, default: 7, min: 0 },
  sku: { type: String, unique: true, sparse: true },
  tags: [{ type: String }],
  isFeatured: { type: Boolean, default: false },
  isFlashSale: { type: Boolean, default: false },
  flashSalePrice: { type: Number },
  flashSaleEndsAt: { type: Date },
  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  // Admin approval for seller products
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'approved', // Admin products auto-approved
  },
  approvalNote: { type: String },
  variants: [variantSchema],
  // Multi-vendor: seller who owns this product (null = admin product)
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null, index: true },
  // Admin / Super Admin who owns this product (only for sellerId = null products).
  // Online payments for this product go to THIS admin's saved payment details.
  ownerAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  jewellery: { type: jewellerySchema, default: () => ({}) },
  weight: { type: Number },
  dimensions: { width: Number, height: Number, length: Number },
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ 'jewellery.metal': 1, 'jewellery.purity': 1 });
productSchema.index({ 'jewellery.pricingMode': 1 });

module.exports = mongoose.model('Product', productSchema);