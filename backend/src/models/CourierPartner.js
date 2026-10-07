const mongoose = require('mongoose');

const courierPartnerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  vehicleType: { type: String, default: 'Bike' },
  vehicleNumber: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
  isAvailable: { type: Boolean, default: true },
  currentLocation: { type: String, default: '' },
  // null = a platform courier added by growthkarts admin, usable for any
  // order. Set = a seller's own delivery partner, only for that seller's
  // orders — this is how Admin/Super Admin tell the two apart in the list.
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
  // Flat payout per completed delivery, set by whoever created the courier
  // (admin or seller) — shown to the courier on their Earnings page.
  perDeliveryFee: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('CourierPartner', courierPartnerSchema);
