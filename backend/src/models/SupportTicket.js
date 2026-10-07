const mongoose = require('mongoose');

// Seller → platform support ticket. Sellers on a plan with the
// `prioritySupport` rule ("Dedicated customer support") get priority tickets,
// which staff see first and answer against a shorter reply target. Sellers
// with a personal business manager have their tickets assigned to them.
const messageSchema = new mongoose.Schema({
  from: { type: String, enum: ['seller', 'staff'], required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: '' },
  text: { type: String, trim: true, maxlength: 4000, default: '' },
  // Screenshots / photos attached to this message
  images: [{ type: String }],
}, { timestamps: true });

const supportTicketSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  ticketNumber: { type: String, unique: true },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  category: {
    type: String,
    enum: ['account', 'plan_payment', 'orders', 'products', 'store', 'technical', 'other'],
    default: 'other',
  },
  priority: { type: String, enum: ['standard', 'priority'], default: 'standard', index: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  messages: [messageSchema],
  lastActivityAt: { type: Date, default: Date.now },
  // Reply target for this ticket, set from the seller's plan when opened.
  replyDueAt: { type: Date },
  firstResponseAt: { type: Date, default: null },
  unreadBySeller: { type: Boolean, default: false },
  unreadByStaff: { type: Boolean, default: true },
}, { timestamps: true });

supportTicketSchema.index({ status: 1, priority: 1, lastActivityAt: -1 });

supportTicketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketNumber = `ST${String(Date.now()).slice(-6)}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
