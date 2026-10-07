const Notification = require('../models/Notification');

// ADMIN: Send notification
exports.sendNotification = async (req, res) => {
  const { title, message, type, targetRole, targetUser } = req.body;
  const notification = await Notification.create({
    title, message, type, targetRole, targetUser,
    sentBy: req.user._id,
  });
  res.status(201).json({ success: true, notification });
};

// Roles whose notifications this user sees. A Super Admin also gets every
// Admin notification (new seller requests, offers to approve, …).
const rolesFor = (user) => (user.role === 'superadmin' ? ['superadmin', 'admin'] : [user.role]);
const myQuery = (user) => ({
  $or: [
    { targetUser: user._id },
    { targetRole: { $in: rolesFor(user) } },
    { targetRole: 'all' },
  ],
});

// USER/SELLER/COURIER: Get my notifications
exports.getMyNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = myQuery(req.user);
  const [notifications, total, unread] = await Promise.all([
    Notification.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, isRead: false }),
  ]);
  res.json({ success: true, notifications, total, unread });
};

// USER: Mark notification as read
exports.markRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
};

// USER: Mark all as read
exports.markAllRead = async (req, res) => {
  await Notification.updateMany(myQuery(req.user), { isRead: true });
  res.json({ success: true });
};

// USER/SELLER/ADMIN: Clear all notifications for the current user/role
exports.clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({
    $or: [
      { targetUser: req.user._id },
      { targetRole: req.user.role },
      { targetRole: 'all' },
    ],
  });
  res.json({ success: true });
};

// ADMIN: Get all notifications
exports.getAllNotifications = async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total] = await Promise.all([
    Notification.find().sort('-createdAt').skip(skip).limit(parseInt(limit)).populate('sentBy', 'name'),
    Notification.countDocuments(),
  ]);
  res.json({ success: true, notifications, total });
};
