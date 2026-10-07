const User = require('../models/User');
const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      addresses: user.addresses,
      permissions: user.permissions || [],
    },
  });
};

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password || !phone)
    return res.status(400).json({ success: false, message: 'Name, email, phone and password are required' });

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ success: false, message: 'Email already registered' });
  if (await User.findOne({ phone: normalizePhone(phone) }))
    return res.status(400).json({ success: false, message: 'Mobile number already registered' });

  // No email code at sign-up (removed on request); the address is unverified.
  const user = await User.create({ name, email, password, phone });
  sendToken(user, 201, res);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Please provide email and password' });

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  // Seller accounts have their own portal (/seller/login) with seller-specific
  // checks (approval status, KYC, etc.) and use a separate auth token.
  // Letting them through here would silently log them in as a plain
  // "customer" — same account, wrong dashboard, no seller session — which is
  // exactly the confusing state this guard prevents.
  if (user.role === 'seller') {
    return res.status(403).json({
      success: false,
      message: 'This email is registered as a seller. Please sign in from the Seller Portal instead.',
      isSeller: true,
    });
  }

  if (!user.isActive)
    return res.status(403).json({ success: false, message: 'Account is deactivated' });

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  sendToken(user, 200, res);
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};

exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  if (String(newPassword).length < 6)
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  if (currentPassword === newPassword)
    return res.status(400).json({ success: false, message: 'New password must be different from the current password' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword)))
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  user.password = newPassword;
  await user.save();
  sendToken(user, 200, res);
};

exports.updateProfile = async (req, res) => {
  const { name, email, phone, avatar } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (name !== undefined && !String(name).trim())
    return res.status(400).json({ success: false, message: 'Name cannot be empty' });
  if (email && email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
    if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
    user.email = email.toLowerCase();
  }
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  await user.save();
  sendToken(user, 200, res);
};
