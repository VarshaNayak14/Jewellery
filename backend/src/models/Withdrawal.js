const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  amount: { type: Number, required: true, min: 1 },
  source: { type: String, enum: ['referral'], default: 'referral' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  paymentMethod: { type: String, default: 'bank_transfer' },
  transactionId: { type: String },
  notes: { type: String },
  adminNotes: { type: String },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
