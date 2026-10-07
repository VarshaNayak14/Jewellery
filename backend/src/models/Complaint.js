const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  category: {
    type: String,
    enum: ['product_not_received', 'wrong_product', 'damaged_product', 'poor_quality', 'refund_delay', 'seller_misbehavior', 'fake_product', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  images: [{ type: String }],
  videos: [{ type: String }],
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'closed'],
    default: 'open',
  },
  resolution: { type: String },
  adminNotes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
