const User = require('../models/User');

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACC_RE = /^\d{6,20}$/;
const clean = (v, max = 120) => String(v ?? '').trim().slice(0, max);

exports.getMyPaymentDetails = async (req, res) => {
  const me = await User.findById(req.user._id).select('+paymentDetails');
  res.json({ success: true, paymentDetails: me.paymentDetails || {} });
};

exports.updateMyPaymentDetails = async (req, res) => {
  const b = req.body || {};
  const d = {
    accountHolder: clean(b.accountHolder),
    upiId: clean(b.upiId, 256),
    qrCodeImage: clean(b.qrCodeImage, 1000),
    bankName: clean(b.bankName),
    accountNumber: clean(b.accountNumber, 20),
    ifsc: clean(b.ifsc, 11).toUpperCase(),
    isEnabled: b.isEnabled !== false,
  };
  if (d.upiId && !UPI_RE.test(d.upiId)) return res.status(400).json({ success: false, message: 'Invalid UPI ID (example: name@upi)' });
  if (d.qrCodeImage && !/^https?:\/\//i.test(d.qrCodeImage)) return res.status(400).json({ success: false, message: 'Invalid QR image' });
  if (d.accountNumber && !ACC_RE.test(d.accountNumber)) return res.status(400).json({ success: false, message: 'Account number must be 6-20 digits' });
  if (d.ifsc && !IFSC_RE.test(d.ifsc)) return res.status(400).json({ success: false, message: 'Invalid IFSC code' });
  if (d.accountNumber && !d.ifsc) return res.status(400).json({ success: false, message: 'IFSC code is required with the account number' });
  if (d.isEnabled && !d.upiId && !d.qrCodeImage && !d.accountNumber) {
    return res.status(400).json({ success: false, message: 'Add at least a UPI ID, a QR code or bank account details' });
  }
  const me = await User.findByIdAndUpdate(req.user._id, { $set: { paymentDetails: d } }, { new: true, runValidators: true }).select('+paymentDetails');
  res.json({ success: true, message: 'Payment details saved', paymentDetails: me.paymentDetails });
};