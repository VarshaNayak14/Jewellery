const SupportTicket = require('../models/SupportTicket');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sellerCaps } = require('../utils/planCapabilities');

// Reply targets shown to sellers and used to flag overdue tickets for staff.
const SLA_HOURS = { priority: 4, standard: 48 };
const CATEGORIES = ['account', 'plan_payment', 'orders', 'products', 'store', 'technical', 'other'];
const MANAGER_FIELDS = 'name email phone avatar';

const notify = (targetUser, title, message, sentBy) => {
  if (!targetUser) return;
  Notification.create({ title, message, type: 'push', targetUser, sentBy }).catch(() => {});
};

// Manager is only exposed while the seller's plan includes the rule.
const managerOf = async (seller) => {
  if (!sellerCaps(seller).businessManager || !seller.accountManager) return null;
  return User.findOne({ _id: seller.accountManager, isActive: true }).select(MANAGER_FIELDS);
};

// ─────────────────────────── Seller side ───────────────────────────

// GET /api/v1/seller/support — tickets + what support this plan includes
exports.getSellerSupport = async (req, res) => {
  const caps = sellerCaps(req.seller);
  const [tickets, manager] = await Promise.all([
    SupportTicket.find({ seller: req.seller._id }).sort('-lastActivityAt').select('-messages'),
    managerOf(req.seller),
  ]);
  res.json({
    success: true,
    tickets,
    support: {
      priority: caps.prioritySupport,
      replyHours: caps.prioritySupport ? SLA_HOURS.priority : SLA_HOURS.standard,
      businessManager: caps.businessManager,
      manager,
    },
  });
};

// POST /api/v1/seller/support  { subject, category, message }
// Up to 5 uploaded image links per message.
const cleanImages = (list) => (Array.isArray(list) ? list : [])
  .map(u => String(u || '').trim())
  .filter(u => /^https?:\/\//i.test(u))
  .slice(0, 5);

exports.createSellerTicket = async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const text = String(req.body.message || '').trim();
  const images = cleanImages(req.body.images);
  if (!subject || !text) return res.status(400).json({ success: false, message: 'Subject and message are required' });
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';

  const caps = sellerCaps(req.seller);
  const priority = caps.prioritySupport ? 'priority' : 'standard';
  const manager = await managerOf(req.seller);
  const ticket = await SupportTicket.create({
    seller: req.seller._id,
    subject: subject.slice(0, 150),
    category,
    priority,
    assignedTo: manager?._id || null,
    replyDueAt: new Date(Date.now() + SLA_HOURS[priority] * 3600 * 1000),
    messages: [{ from: 'seller', author: req.user._id, authorName: req.user.name, text, images }],
  });
  if (manager) notify(manager._id, `New ticket from ${req.seller.shopName}`, `${ticket.ticketNumber}: ${ticket.subject}`, req.user._id);
  res.status(201).json({ success: true, ticket });
};

const findSellerTicket = (req) => SupportTicket.findOne({ _id: req.params.id, seller: req.seller._id })
  .populate('assignedTo', 'name');

// GET /api/v1/seller/support/:id
exports.getSellerTicket = async (req, res) => {
  const ticket = await findSellerTicket(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.unreadBySeller) { ticket.unreadBySeller = false; await ticket.save(); }
  res.json({ success: true, ticket });
};

// POST /api/v1/seller/support/:id/reply  { message }
exports.replySellerTicket = async (req, res) => {
  const text = String(req.body.message || '').trim();
  const images = cleanImages(req.body.images);
  if (!text && !images.length) return res.status(400).json({ success: false, message: 'Write a message or attach a photo' });
  const ticket = await findSellerTicket(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'This ticket is closed. Please open a new ticket.' });
  ticket.messages.push({ from: 'seller', author: req.user._id, authorName: req.user.name, text, images });
  if (ticket.status === 'resolved') ticket.status = 'open'; // seller says it isn't fixed
  ticket.lastActivityAt = new Date();
  ticket.unreadByStaff = true;
  await ticket.save();
  if (ticket.assignedTo) notify(ticket.assignedTo._id, `Reply from ${req.seller.shopName}`, `${ticket.ticketNumber}: ${text ? text.slice(0, 120) : `${images.length} photo(s)`}`, req.user._id);
  res.json({ success: true, ticket });
};

// PUT /api/v1/seller/support/:id/close
exports.closeSellerTicket = async (req, res) => {
  const ticket = await findSellerTicket(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  ticket.status = 'closed';
  ticket.lastActivityAt = new Date();
  await ticket.save();
  res.json({ success: true, ticket });
};

// ─────────────────────────── Staff side ───────────────────────────

// GET /api/v1/admin/support?status=&priority=&mine=1&search=
// Priority (dedicated support) tickets first, then most recent activity.
exports.getAllTickets = async (req, res) => {
  const { status, priority, mine, search, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status === 'active') filter.status = { $in: ['open', 'in_progress'] };
  else if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (mine === '1') filter.assignedTo = req.user._id;
  if (search) {
    const sellers = await Seller.find({ shopName: { $regex: search, $options: 'i' } }).select('_id');
    filter.$or = [
      { seller: { $in: sellers.map(s => s._id) } },
      { ticketNumber: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [tickets, total, openCount, priorityOpen, overdue, mineOpen] = await Promise.all([
    // 'priority' sorts before 'standard' alphabetically, so ascending = priority first.
    SupportTicket.find(filter).sort({ priority: 1, lastActivityAt: -1 }).skip(skip).limit(Number(limit))
      .select('-messages')
      .populate('seller', 'shopName shopSlug logo planSnapshot.name')
      .populate('assignedTo', 'name'),
    SupportTicket.countDocuments(filter),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] }, priority: 'priority' }),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] }, firstResponseAt: null, replyDueAt: { $lt: new Date() } }),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] }, assignedTo: req.user._id }),
  ]);
  res.json({
    success: true, tickets, total, pages: Math.ceil(total / Number(limit)),
    stats: { open: openCount, priorityOpen, overdue, mine: mineOpen },
  });
};

const findTicket = (id) => SupportTicket.findById(id)
  .populate({ path: 'seller', select: 'shopName shopSlug logo phone whatsapp planSnapshot.name planExpiresAt accountManager', populate: { path: 'user', select: 'name email phone' } })
  .populate('assignedTo', 'name email');

// GET /api/v1/admin/support/:id
exports.getTicket = async (req, res) => {
  const ticket = await findTicket(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.unreadByStaff) { ticket.unreadByStaff = false; await ticket.save(); }
  res.json({ success: true, ticket });
};

// POST /api/v1/admin/support/:id/reply  { message }
exports.replyTicket = async (req, res) => {
  const text = String(req.body.message || '').trim();
  const images = cleanImages(req.body.images);
  if (!text && !images.length) return res.status(400).json({ success: false, message: 'Write a message or attach a photo' });
  const ticket = await findTicket(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  ticket.messages.push({ from: 'staff', author: req.user._id, authorName: req.user.name, text, images });
  if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
  if (ticket.status === 'open') ticket.status = 'in_progress';
  // Auto-assign to the admin staff member who picks it up. Super Admin
  // oversees every ticket, so replying doesn't assign it to them.
  if (!ticket.assignedTo && req.user.role === 'admin') ticket.assignedTo = req.user._id;
  ticket.lastActivityAt = new Date();
  ticket.unreadBySeller = true;
  await ticket.save();
  const sellerDoc = await Seller.findById(ticket.seller._id).select('user');
  notify(sellerDoc?.user, `Support replied: ${ticket.subject}`, text ? text.slice(0, 160) : `${images.length} photo(s)`, req.user._id);
  res.json({ success: true, ticket: await findTicket(ticket._id) });
};

// PUT /api/v1/admin/support/:id  { status?, assignedTo? }
exports.updateTicket = async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  const { status, assignedTo } = req.body;
  if (status !== undefined) {
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    ticket.status = status;
  }
  if (assignedTo !== undefined) {
    if (assignedTo) {
      const staff = await User.findOne({ _id: assignedTo, role: 'admin', isActive: true });
      if (!staff) return res.status(400).json({ success: false, message: 'Staff member not found' });
    }
    ticket.assignedTo = assignedTo || null;
  }
  ticket.lastActivityAt = new Date();
  await ticket.save();
  res.json({ success: true, ticket: await findTicket(ticket._id) });
};

// GET /api/v1/admin/support/staff — active Admin staff accounts (Super Admin
// is excluded: they oversee everything and aren't assigned work)
// (for assigning tickets and personal business managers)
exports.getStaff = async (req, res) => {
  const staff = await User.find({ role: 'admin', isActive: true })
    .select('name email phone role').sort('name');
  res.json({ success: true, staff });
};

// PUT /api/v1/admin/sellers/:id/manager  { managerId | null }
exports.assignSellerManager = async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
  const { managerId } = req.body;
  if (managerId) {
    if (!sellerCaps(seller).businessManager) {
      return res.status(400).json({ success: false, message: `The ${seller.planSnapshot?.name || 'current'} plan does not include a personal business manager.` });
    }
    const manager = await User.findOne({ _id: managerId, role: 'admin', isActive: true });
    if (!manager) return res.status(400).json({ success: false, message: 'Staff member not found' });
    seller.accountManager = manager._id;
    // Route the seller's open tickets to their new manager.
    await SupportTicket.updateMany({ seller: seller._id, status: { $in: ['open', 'in_progress'] } }, { assignedTo: manager._id });
    notify(seller.user, 'Your personal business manager', `${manager.name} is now your personal business manager. Reach them anytime from Help & Support.`, req.user._id);
    notify(manager._id, 'New seller assigned', `You are now the business manager for ${seller.shopName}.`, req.user._id);
  } else {
    seller.accountManager = null;
  }
  await seller.save();
  await seller.populate('accountManager', MANAGER_FIELDS);
  res.json({ success: true, accountManager: seller.accountManager });
};
