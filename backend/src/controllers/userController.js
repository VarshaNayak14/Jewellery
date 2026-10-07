const User = require('../models/User');
const { verifyAddress } = require('../utils/pincode');

// Keeps the one-line street in step with house no. + area.
const withStreet = (a) => (a.houseNo || a.area ? { ...a, street: [a.houseNo, a.area].filter(Boolean).join(', ') } : a);

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};

exports.updateProfile = async (req, res) => {
  const { name, email, phone, avatar } = req.body;
  if (email && email.toLowerCase() !== req.user.email) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email: email?.toLowerCase(), phone, avatar },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
};

exports.addAddress = async (req, res) => {
  const check = await verifyAddress(req.body);
  if (!check.ok) return res.status(400).json({ success: false, message: check.message });
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
  user.addresses.push(withStreet(req.body));
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.updateAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
  // Only re-check when the location itself changes (not for "set as default").
  if (['pincode', 'state', 'district'].some(k => req.body[k] !== undefined)) {
    const check = await verifyAddress({ ...address.toObject(), ...req.body });
    if (!check.ok) return res.status(400).json({ success: false, message: check.message });
  }
  if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
  Object.assign(address, withStreet(req.body));
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.deleteAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.pull(req.params.addressId);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, search, from, to } = req.query;
  // This endpoint powers the "Customer Management" screen only — it should
  // list customers (role: 'user'), not sellers/admins/superadmins.
  const query = { role: 'user' };
  if (search) {
    query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  }
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, users, total });
};

exports.updateUserRole = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
};

exports.toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, user });
};