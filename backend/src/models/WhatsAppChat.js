const mongoose = require('mongoose');

// One WhatsApp conversation per customer phone number. Messages arrive from
// the WhatsApp automation provider's webhook (inbound) and from staff
// replies in the Admin / Super Admin "WhatsApp Enquiries" inbox (outbound).
const waMessageSchema = new mongoose.Schema({
  direction: { type: String, enum: ['in', 'out'], required: true },
  text: { type: String, default: '', maxlength: 4096 },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  // Provider's message id — used to skip duplicate webhook deliveries
  providerId: { type: String, default: '' },
  // Outbound delivery state: pending (API not connected yet) → sent → delivered → read, or failed
  status: { type: String, enum: ['received', 'pending', 'sent', 'delivered', 'read', 'failed'], default: 'received' },
  error: { type: String, default: '' },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sentByName: { type: String, default: '' },
}, { timestamps: true });

const whatsAppChatSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true }, // digits only, with country code
  name: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // matched customer account, if any
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  unread: { type: Number, default: 0 },
  lastMessage: { type: String, default: '' },
  lastDirection: { type: String, default: 'in' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  notes: { type: String, default: '', maxlength: 2000 },
  messages: [waMessageSchema],
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppChat', whatsAppChatSchema);
