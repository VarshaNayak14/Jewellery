const mongoose = require('mongoose');

// Customer → seller support ticket. It starts with the seller who sold the
// order / product ("seller" level). If the seller doesn't reply in time, or
// the customer says the issue isn't solved, it moves to the growthkarts team
// ("platform" level: Admin / Super Admin). Tickets about platform products
// (no seller) start at the platform level.
const messageSchema = new mongoose.Schema({
  from: { type: String, enum: ['customer', 'seller', 'staff', 'system'], required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: '' },
  text: { type: String, trim: true, maxlength: 4000, default: '' },
  images: [{ type: String }],
}, { timestamps: true });

const customerTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderNumber: { type: String, default: '' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, default: '' },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  category: {
    type: String,
    enum: ['order_issue', 'delivery', 'product_quality', 'wrong_item', 'refund', 'payment', 'other'],
    default: 'other',
  },
  // Who is handling it now
  level: { type: String, enum: ['seller', 'platform'], default: 'seller', index: true },
  status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open', index: true },
  // Seller must reply before this, otherwise it goes to the platform team.
  sellerReplyDueAt: { type: Date },
  sellerRepliedAt: { type: Date, default: null },
  escalatedAt: { type: Date, default: null },
  escalationReason: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  messages: [messageSchema],
  lastActivityAt: { type: Date, default: Date.now },
  unreadByCustomer: { type: Boolean, default: false },
  unreadBySeller: { type: Boolean, default: true },
  unreadByStaff: { type: Boolean, default: false },
}, { timestamps: true });

customerTicketSchema.index({ level: 1, status: 1, lastActivityAt: -1 });

customerTicketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('CustomerTicket').countDocuments();
    this.ticketNumber = `CT${String(Date.now()).slice(-6)}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CustomerTicket', customerTicketSchema);
