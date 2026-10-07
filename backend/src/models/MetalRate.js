const mongoose = require('mongoose');

// Today's per-gram rate for one metal + purity, e.g. gold 22K = ₹6,750/g.
// Products priced in "live" mode are recalculated from these rates whenever
// an Admin / Super Admin saves new rates.
const metalRateSchema = new mongoose.Schema({
  metal: { type: String, enum: ['gold', 'silver', 'platinum'], required: true },
  purity: { type: String, required: true, trim: true },
  ratePerGram: { type: Number, required: true, min: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

metalRateSchema.index({ metal: 1, purity: 1 }, { unique: true });

module.exports = mongoose.model('MetalRate', metalRateSchema);
