const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['push', 'email', 'sms'], default: 'push' },
  targetRole: { type: String, enum: ['all', 'user', 'seller', 'admin', 'superadmin'], default: 'all' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  relatedReturn: { type: mongoose.Schema.Types.ObjectId, ref: 'Return' },
  isRead: { type: Boolean, default: false },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);