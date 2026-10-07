const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  balanceAfter: { type: Number, required: true },
  reason: { type: String, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  return: { type: mongoose.Schema.Types.ObjectId, ref: 'Return' },
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
