const mongoose = require('mongoose');

const courierSellerPaymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  courier: { type: mongoose.Schema.Types.ObjectId, ref: 'CourierPartner', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  amount: { type: Number, required: true, min: 0 },
  settlementMode: { type: String, enum: ['online', 'manual'], default: 'online' },
  bankDetails: {
    accountHolder: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    upiId: String,
    qrCodeImage: String,
  },
  proofUrl: { type: String, default: '' },
  courierNote: { type: String, default: '' },
  sellerNote: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'disputed'],
    default: 'pending',
  },
  submittedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
}, { timestamps: true });

courierSellerPaymentSchema.index({ order: 1, seller: 1 }, { unique: true });

module.exports = mongoose.model('CourierSellerPayment', courierSellerPaymentSchema);
