const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
  name: String,
  phone: String,
  houseNo: String,
  area: String,
  street: String,
  city: String,
  district: String,
  state: String,
  pincode: String,
  isDefault: { type: Boolean, default: false },
});

// Where customers pay for this admin's / super admin's OWN products.
// Only meaningful for role = 'admin' | 'superadmin'.
const paymentDetailsSchema = new mongoose.Schema({
  accountHolder: { type: String, trim: true, default: '' },
  upiId: { type: String, trim: true, default: '' },
  qrCodeImage: { type: String, trim: true, default: '' },
  bankName: { type: String, trim: true, default: '' },
  accountNumber: { type: String, trim: true, default: '' },
  ifsc: { type: String, trim: true, uppercase: true, default: '' },
  isEnabled: { type: Boolean, default: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin', 'superadmin', 'seller', 'courier'], default: 'user' },
  // Only relevant for role='admin' — which modules this admin staff account can access.
  // Empty array = no restriction (full access). Ignored for 'superadmin' (always full access).
  permissions: [{ type: String }],
  // select:false -> never leaks through user lists; load with .select('+paymentDetails')
  paymentDetails: { type: paymentDetailsSchema, default: () => ({}), select: false },
  // Which superadmin created this admin account (for audit trail)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addresses: [addressSchema],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET || 'growthkarts_secret_key', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = mongoose.model('User', userSchema);