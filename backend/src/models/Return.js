const mongoose = require('mongoose');

const trackingUpdateSchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String },
  note: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
});

const returnSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  assignedCourier: { type: mongoose.Schema.Types.ObjectId, ref: 'CourierPartner', default: null },
  assignedAt: { type: Date },
  pickedUpAt: { type: Date },
  reason: {
    type: String,
    enum: ['wrong_product', 'damaged', 'size_issue', 'quality_issue', 'missing_item', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  images: [{ type: String }],
  videos: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'refund_initiated', 'refund_completed'],
    default: 'pending',
  },
  refundMethod: {
    type: String,
    enum: ['wallet'],
    default: 'wallet',
  },
  refundAmount: { type: Number, default: 0 },
  adminNotes: { type: String },
  sellerNotes: { type: String },
  trackingHistory: [trackingUpdateSchema],
  pickupDate: { type: Date },
  refundedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
