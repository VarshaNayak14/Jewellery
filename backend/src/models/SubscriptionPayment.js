const mongoose = require('mongoose');

// A ledger entry for each time a seller purchases or renews a subscription
// plan, so Admin/SuperAdmin can see subscription revenue over time — separate
// from the Seller's current plan/planExpiresAt, which only holds the latest state.
const subscriptionPaymentSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  planName: { type: String, required: true },
  purpose: { type: String, enum: ['seller', 'offer'], default: 'seller', index: true },
  amount: { type: Number, required: true, min: 0 },
  // 'pending' = manual bank/QR transfer awaiting Admin verification.
  status: { type: String, enum: ['paid', 'pending', 'failed', 'refunded'], default: 'paid' },
  paymentMethod: { type: String, default: 'signup' }, // 'razorpay' | 'bank_qr' | 'signup' | 'admin_assignment' | 'credit'
  transactionId: { type: String },
  paymentScreenshot: { type: String, default: '' },
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);