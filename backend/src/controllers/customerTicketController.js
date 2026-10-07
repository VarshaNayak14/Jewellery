const CustomerTicket = require('../models/CustomerTicket');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────
// Customer support tickets.
//   1. Customer opens a ticket about an order / product → it goes to that
//      seller (platform products go straight to the growthkarts team).
//   2. The seller replies and can mark it resolved.
//   3. It moves to Admin / Super Admin ("platform" level) when
//        - the seller hasn't replied within SELLER_REPLY_HOURS, or
//        - the customer says it isn't solved ("Send to growthkarts team").
// ─────────────────────────────────────────────────────────────────────────

const SELLER_REPLY_HOURS = 48;
const CATEGORIES = ['order_issue', 'delivery', 'product_quality', 'wrong_item', 'refund', 'payment', 'other'];

const notifyUser = (targetUser, title, message) => {
  if (!targetUser) return;
  Notification.create({ title, message, type: 'push', targetUser }).catch(() => {});
};
// Admin-role notifications reach Super Admin too.
const notifyTeam = (title, message) => Notification.create({ title, message, type: 'push', targetRole: 'admin' }).catch(() => {});

const cleanImages = (list) => (Array.isArray(list) ? list : [])
  .map(u => String(u || '').trim())
  .filter(u => /^https?:\/\//i.test(u))
  .slice(0, 5);

const readMessage = (req) => ({
  text: String(req.body.message || '').trim().slice(0, 4000),
  images: cleanImages(req.body.images),
});

const escalate = (ticket, reason) => {
  ticket.level = 'platform';
  ticket.status = 'open';
  ticket.escalatedAt = new Date();
  ticket.escalationReason = reason;
  ticket.unreadByStaff = true;
  ticket.messages.push({ from: 'system', text: `Moved to the growthkarts support team — ${reason}.` });
};

// Seller hasn't replied in time → hand over to the platform team. Runs
// lazily whenever tickets are listed, so no background job is needed.
async function escalateOverdue() {
  const overdue = await CustomerTicket.find({
    level: 'seller', status: 'open', sellerRepliedAt: null, sellerReplyDueAt: { $lte: new Date() },
  }).limit(200);
  for (const t of overdue) {
    escalate(t, `the seller did not reply within ${SELLER_REPLY_HOURS} hours`);
    t.unreadByCustomer = true;
    await t.save();
    notifyUser(t.user, 'Your ticket moved to growthkarts support', `${t.ticketNumber}: our team will now help you.`);
    notifyTeam('Customer ticket escalated', `${t.ticketNumber} — seller did not reply in ${SELLER_REPLY_HOURS} hours.`);
  }
}

const populateTicket = (q) => q
  .populate('user', 'name email phone')
  .populate('seller', 'shopName shopSlug phone user')
  .populate('assignedTo', 'name');

// ── Customer ─────────────────────────────────────────────────────────────

// GET /api/v1/customer-tickets/my
exports.getMyTickets = async (req, res) => {
  await escalateOverdue();
  const tickets = await CustomerTicket.find({ user: req.user._id })
    .select('-messages').populate('seller', 'shopName').sort('-lastActivityAt');
  res.json({ success: true, tickets });
};

// POST /api/v1/customer-tickets  { subject, category, message, images, orderId?, productId? }
exports.createTicket = async (req, res) => {
  const subject = String(req.body.subject || '').trim().slice(0, 150);
  const { text, images } = readMessage(req);
  if (!subject || !text) return res.status(400).json({ success: false, message: 'Subject and message are required' });
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';

  let order = null; let product = null; let sellerId = null;
  if (req.body.orderId) {
    order = await Order.findOne({ _id: req.body.orderId, user: req.user._id }).select('orderNumber items');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  }
  if (req.body.productId) {
    product = await Product.findById(req.body.productId).select('name sellerId');
    const item = order?.items.find(i => String(i.product) === String(req.body.productId));
    sellerId = item?.seller || product?.sellerId || null;
  } else if (order) {
    // Order with one seller → that seller; mixed/platform → platform team
    const sellers = [...new Set(order.items.map(i => (i.seller ? String(i.seller) : '')))];
    sellerId = sellers.length === 1 && sellers[0] ? sellers[0] : null;
  }

  const seller = sellerId ? await Seller.findById(sellerId).select('shopName user') : null;
  const ticket = await CustomerTicket.create({
    user: req.user._id,
    seller: seller?._id || null,
    order: order?._id || null,
    orderNumber: order?.orderNumber || '',
    product: product?._id || null,
    productName: product?.name || '',
    subject,
    category,
    level: seller ? 'seller' : 'platform',
    sellerReplyDueAt: seller ? new Date(Date.now() + SELLER_REPLY_HOURS * 3600 * 1000) : undefined,
    unreadBySeller: Boolean(seller),
    unreadByStaff: !seller,
    messages: [{ from: 'customer', author: req.user._id, authorName: req.user.name, text, images }],
  });

  if (seller) notifyUser(seller.user, 'New customer ticket', `${ticket.ticketNumber}: ${subject} — please reply within ${SELLER_REPLY_HOURS} hours.`);
  else notifyTeam('New customer ticket', `${ticket.ticketNumber}: ${subject}`);
  res.status(201).json({ success: true, ticket });
};

const findMine = (req) => populateTicket(CustomerTicket.findOne({ _id: req.params.id, user: req.user._id }));

// GET /api/v1/customer-tickets/:id
exports.getMyTicket = async (req, res) => {
  const ticket = await findMine(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.unreadByCustomer) { ticket.unreadByCustomer = false; await ticket.save(); }
  res.json({ success: true, ticket, sellerReplyHours: SELLER_REPLY_HOURS });
};

// POST /api/v1/customer-tickets/:id/reply  { message, images }
exports.replyMyTicket = async (req, res) => {
  const { text, images } = readMessage(req);
  if (!text && !images.length) return res.status(400).json({ success: false, message: 'Write a message or attach a photo' });
  const ticket = await findMine(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'This ticket is closed. Please open a new one.' });
  ticket.messages.push({ from: 'customer', author: req.user._id, authorName: req.user.name, text, images });
  if (ticket.status === 'resolved') ticket.status = 'open';
  ticket.lastActivityAt = new Date();
  if (ticket.level === 'seller') ticket.unreadBySeller = true; else ticket.unreadByStaff = true;
  await ticket.save();
  if (ticket.level === 'seller') notifyUser(ticket.seller?.user, 'Customer replied', `${ticket.ticketNumber}: ${text.slice(0, 120) || 'sent a photo'}`);
  res.json({ success: true, ticket });
};

// POST /api/v1/customer-tickets/:id/escalate  { reason? } — "not solved"
exports.escalateMyTicket = async (req, res) => {
  const ticket = await findMine(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.level === 'platform') return res.status(400).json({ success: false, message: 'The growthkarts team is already handling this ticket' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'This ticket is closed' });
  const reason = String(req.body.reason || '').trim().slice(0, 300);
  escalate(ticket, reason ? `customer: "${reason}"` : 'the customer said the issue is not solved');
  ticket.lastActivityAt = new Date();
  await ticket.save();
  notifyUser(ticket.seller?.user, 'Ticket moved to growthkarts support', `${ticket.ticketNumber} was sent to the growthkarts team by the customer.`);
  notifyTeam('Customer ticket escalated', `${ticket.ticketNumber}: ${ticket.subject} (not solved by ${ticket.seller?.shopName || 'the seller'})`);
  res.json({ success: true, ticket });
};

// PUT /api/v1/customer-tickets/:id/close — customer is happy
exports.closeMyTicket = async (req, res) => {
  const ticket = await findMine(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  ticket.status = 'closed';
  ticket.messages.push({ from: 'system', text: 'Closed by the customer.' });
  ticket.lastActivityAt = new Date();
  await ticket.save();
  res.json({ success: true, ticket });
};

// ── Seller ───────────────────────────────────────────────────────────────

// GET /api/v1/seller/customer-tickets?status=
exports.getSellerTickets = async (req, res) => {
  await escalateOverdue();
  const filter = { seller: req.seller._id };
  if (['open', 'resolved', 'closed'].includes(req.query.status)) filter.status = req.query.status;
  const tickets = await CustomerTicket.find(filter).select('-messages')
    .populate('user', 'name').sort('-lastActivityAt').limit(300);
  res.json({ success: true, tickets, replyHours: SELLER_REPLY_HOURS });
};

const findSellers = (req) => populateTicket(CustomerTicket.findOne({ _id: req.params.id, seller: req.seller._id }));

// GET /api/v1/seller/customer-tickets/:id
exports.getSellerTicket = async (req, res) => {
  const ticket = await findSellers(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.unreadBySeller) { ticket.unreadBySeller = false; await ticket.save(); }
  res.json({ success: true, ticket });
};

// POST /api/v1/seller/customer-tickets/:id/reply  { message, images, resolve? }
exports.replySellerTicket = async (req, res) => {
  const { text, images } = readMessage(req);
  if (!text && !images.length) return res.status(400).json({ success: false, message: 'Write a message or attach a photo' });
  const ticket = await findSellers(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'This ticket is closed' });
  ticket.messages.push({ from: 'seller', author: req.user._id, authorName: req.seller.shopName, text, images });
  if (!ticket.sellerRepliedAt) ticket.sellerRepliedAt = new Date();
  if (req.body.resolve && ticket.level === 'seller') ticket.status = 'resolved';
  ticket.lastActivityAt = new Date();
  ticket.unreadByCustomer = true;
  if (ticket.level === 'platform') ticket.unreadByStaff = true;
  await ticket.save();
  notifyUser(ticket.user?._id, `${req.seller.shopName} replied`, `${ticket.ticketNumber}: ${text.slice(0, 140) || 'sent a photo'}`);
  res.json({ success: true, ticket });
};

// ── Admin / Super Admin ──────────────────────────────────────────────────

// GET /api/v1/admin/customer-tickets?level=platform|seller|all&status=&search=
exports.getAllTickets = async (req, res) => {
  await escalateOverdue();
  const filter = {};
  const level = req.query.level || 'platform';
  if (['platform', 'seller'].includes(level)) filter.level = level;
  if (['open', 'resolved', 'closed'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ ticketNumber: rx }, { subject: rx }, { orderNumber: rx }];
  }
  const [tickets, counts] = await Promise.all([
    CustomerTicket.find(filter).select('-messages')
      .populate('user', 'name email').populate('seller', 'shopName').sort('-lastActivityAt').limit(300),
    CustomerTicket.aggregate([{ $match: { status: { $ne: 'closed' } } }, { $group: { _id: '$level', n: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, tickets, openCounts: Object.fromEntries(counts.map(c => [c._id, c.n])) });
};

// GET /api/v1/admin/customer-tickets/:id
exports.getTicket = async (req, res) => {
  const ticket = await populateTicket(CustomerTicket.findById(req.params.id));
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.level === 'platform' && ticket.unreadByStaff) { ticket.unreadByStaff = false; await ticket.save(); }
  res.json({ success: true, ticket });
};

// POST /api/v1/admin/customer-tickets/:id/reply  { message, images }
// Staff can step in on any ticket; replying takes it over (platform level).
exports.replyTicket = async (req, res) => {
  const { text, images } = readMessage(req);
  if (!text && !images.length) return res.status(400).json({ success: false, message: 'Write a message or attach a photo' });
  const ticket = await populateTicket(CustomerTicket.findById(req.params.id));
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.level === 'seller') escalate(ticket, `taken over by ${req.user.name}`);
  ticket.messages.push({ from: 'staff', author: req.user._id, authorName: `${req.user.name} (growthkarts)`, text, images });
  if (!ticket.assignedTo && req.user.role === 'admin') ticket.assignedTo = req.user._id;
  if (ticket.status !== 'open') ticket.status = 'open';
  ticket.lastActivityAt = new Date();
  ticket.unreadByCustomer = true;
  if (ticket.seller) ticket.unreadBySeller = true;
  await ticket.save();
  notifyUser(ticket.user?._id, 'growthkarts support replied', `${ticket.ticketNumber}: ${text.slice(0, 140) || 'sent a photo'}`);
  res.json({ success: true, ticket: await populateTicket(CustomerTicket.findById(ticket._id)) });
};

// PUT /api/v1/admin/customer-tickets/:id  { status }
exports.updateTicket = async (req, res) => {
  const ticket = await populateTicket(CustomerTicket.findById(req.params.id));
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (['open', 'resolved', 'closed'].includes(req.body.status)) {
    ticket.status = req.body.status;
    ticket.messages.push({ from: 'system', text: `Marked ${req.body.status} by the growthkarts team.` });
    ticket.lastActivityAt = new Date();
    ticket.unreadByCustomer = true;
    await ticket.save();
    notifyUser(ticket.user?._id, `Ticket ${req.body.status}`, `${ticket.ticketNumber}: ${ticket.subject}`);
  }
  res.json({ success: true, ticket });
};
