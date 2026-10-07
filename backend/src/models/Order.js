const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  image: String,
  price: Number,
  size: String,
  color: String,
  quantity: { type: Number, required: true, min: 1 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  ownerAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, unique: true },
  items: [orderItemSchema],
  shippingAddress: {
    name: String,
    phone: String,
    houseNo: String,
    area: String,
    street: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
  },
  paymentMethod: { type: String, default: 'razorpay' },
  paymentReference: { type: String, trim: true, default: '' },
  paymentScreenshot: { type: String, trim: true, default: '' },
  sellerPaymentDetails: {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    shopName: String,
    upiId: String,
    qrCodeImage: String,
  },
  // Snapshot of the admin's payment details the customer paid to (paymentMethod = 'admin_direct')
  adminPaymentDetails: {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    upiId: String,
    qrCodeImage: String,
    bankName: String,
    accountNumber: String,
    ifsc: String,
  },
  adminPaymentStatus: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
  adminPaymentVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminPaymentVerifiedAt: { type: Date },
  adminPaymentNote: { type: String, default: '' },
  paymentResult: {
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
  },
  itemsPrice: { type: Number, required: true },
  shippingPrice: { type: Number, default: 0 },
  taxPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  walletAmountUsed: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  sellerEarningsCredited: { type: Boolean, default: false },
  sellerEarningsCreditedAt: { type: Date },
  status: {
    type: String,
    enum: [
      'pending', 'confirmed', 'packed', 'ready_for_pickup',
      'picked_up', 'shipped', 'reached_sorting_center', 'in_transit',
      'reached_destination_city', 'out_for_delivery', 'delivered',
      'cancelled', 'returned', 'refunded', 'failed_delivery'
    ],
    default: 'pending',
  },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
  // Tracking
  trackingNumber: { type: String },
  assignedCourier: { type: mongoose.Schema.Types.ObjectId, ref: 'CourierPartner' },
  courierCompany: { type: String },
  estimatedDelivery: { type: Date },
  // Seller status (for multi-vendor)
  sellerStatus: {
    type: String,
    enum: ['new', 'accepted', 'packed', 'ready_for_pickup'],
    default: 'new',
  },
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `LF${String(Date.now()).slice(-8)}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);