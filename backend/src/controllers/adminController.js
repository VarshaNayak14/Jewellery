const User = require('../models/User');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const Order = require('../models/Order');

// Buckets an array of docs by day (using `dateField`) into a chart-ready
// [{ date: 'YYYY-MM-DD', count }] series covering every day in [from, to] —
// days with zero activity are included as 0 so the chart doesn't skip gaps.
function bucketByDay(docs, dateField, from, to) {
  const counts = new Map();
  docs.forEach(d => {
    const key = new Date(d[dateField]).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const series = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(to);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, count: counts.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

// Platform revenue comes entirely from seller Subscription Payments in the
// connect-only model — there are no platform-mediated orders to aggregate.
exports.getDashboardStats = async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalUsers, totalProducts, totalSellers, pendingSellers,
    monthRevenue, lastMonthRevenue,
    newSellersThisMonth, newSellersLastMonth,
    lowStockProducts,
    recentPayments,
    sellersByStatus, revenueByMonth,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Product.countDocuments({ isActive: true }),
    Seller.countDocuments({ status: 'approved' }),
    Seller.countDocuments({ status: 'pending' }),
    SubscriptionPayment.aggregate([
      { $match: { status: 'paid', purchasedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    SubscriptionPayment.aggregate([
      { $match: { status: 'paid', purchasedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Seller.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Seller.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Product.countDocuments({ stock: { $lte: 5 }, isActive: true }),
    SubscriptionPayment.find().sort('-purchasedAt').limit(10)
      .populate('seller', 'shopName shopSlug'),
    Seller.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    SubscriptionPayment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: { year: { $year: '$purchasedAt' }, month: { $month: '$purchasedAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
  ]);

  const currentRevenue = monthRevenue[0]?.total || 0;
  const previousRevenue = lastMonthRevenue[0]?.total || 0;
  const revenueGrowth = previousRevenue > 0 ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1) : 100;
  const sellerGrowth = newSellersLastMonth > 0 ? (((newSellersThisMonth - newSellersLastMonth) / newSellersLastMonth) * 100).toFixed(1) : 100;

  res.json({
    success: true,
    stats: {
      totalUsers, totalProducts, totalSellers, pendingSellers,
      currentRevenue,
      revenueGrowth: Number(revenueGrowth),
      newSellersThisMonth,
      sellerGrowth: Number(sellerGrowth),
      lowStockProducts,
    },
    recentPayments, sellersByStatus, revenueByMonth,
  });
};

// ADMIN: Get all users
exports.getAdminUsers = async (req, res) => {
  const { search, page = 1, limit = 20, status } = req.query;
  const query = { role: { $ne: 'admin' } };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  if (status === 'active') query.isActive = true;
  if (status === 'blocked') query.isActive = false;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, users, total });
};

// ADMIN: Block/unblock user
exports.toggleUserBlock = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, user, message: user.isActive ? 'User unblocked' : 'User blocked' });
};

// ADMIN: Delete user
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
};

// ADMIN: Reports & Analytics — powers the Reports page's 6 report types, each
// scoped to the given date range, returning a flat `data` table (for the
// on-screen table + CSV export) plus a `summary` of key totals (for the
// stat cards). See AdminReports.jsx for the calling UI.
// GET /api/v1/admin/reports/sales?type=sales|orders|sellers|products|customers&start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getSalesReport = async (req, res) => {
  const { type = 'sales', start, end } = req.query;
  if (!start || !end) return res.status(400).json({ success: false, message: 'start and end dates are required' });

  const from = new Date(start);
  const to = new Date(end);
  to.setHours(23, 59, 59, 999);

  if (type === 'sales') {
    const rows = await SubscriptionPayment.aggregate([
      { $match: { status: 'paid', purchasedAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { year: { $year: '$purchasedAt' }, month: { $month: '$purchasedAt' }, day: { $dayOfMonth: '$purchasedAt' } },
          revenue: { $sum: '$amount' }, payments: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    const data = rows.map(r => ({
      date: `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
      payments: r.payments, revenue: r.revenue,
    }));
    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const totalPayments = data.reduce((s, d) => s + d.payments, 0);
    // Fill in zero-revenue days so the chart doesn't skip gaps in the range.
    const chartData = bucketByDay([], null, from, to).map(d => {
      const match = data.find(x => x.date === d.date);
      return { date: d.date, value: match?.revenue || 0 };
    });
    return res.json({
      success: true, data, chartData,
      summary: { totalRevenue, totalPayments, avgPayment: totalPayments ? Math.round(totalRevenue / totalPayments) : 0 },
    });
  }

  if (type === 'orders') {
    const orders = await Order.find({ createdAt: { $gte: from, $lte: to } })
      .populate('user', 'name email')
      .sort('-createdAt');
    const data = orders.map(o => ({
      orderNumber: o.orderNumber, customer: o.user?.name || o.user?.email || '—',
      amount: o.totalPrice, status: o.status, paid: o.isPaid ? 'Yes' : 'No',
      date: o.createdAt.toISOString().slice(0, 10),
    }));
    const totalRevenue = orders.filter(o => o.isPaid).reduce((s, o) => s + (o.totalPrice || 0), 0);
    const chartData = bucketByDay(orders, 'createdAt', from, to).map(d => ({ date: d.date, value: d.count }));
    return res.json({
      success: true, data, chartData,
      summary: { totalOrders: orders.length, totalRevenue, avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0 },
    });
  }

  if (type === 'sellers') {
    const sellers = await Seller.find({ createdAt: { $gte: from, $lte: to } })
      .populate('user', 'name email')
      .sort('-createdAt');
    const counts = await Product.aggregate([{ $group: { _id: '$sellerId', count: { $sum: 1 } } }]);
    const countBySeller = new Map(counts.map(c => [String(c._id), c.count]));
    const data = sellers.map(s => ({
      shop: s.shopName, owner: s.user?.name || '—', plan: s.planSnapshot?.name || '—',
      scope: s.planSnapshot?.visibilityScope || '—', products: countBySeller.get(String(s._id)) || 0,
      rating: s.avgRating || 0, status: s.status, registered: s.createdAt.toISOString().slice(0, 10),
    }));
    const chartData = bucketByDay(sellers, 'createdAt', from, to).map(d => ({ date: d.date, value: d.count }));
    return res.json({
      success: true, data, chartData,
      summary: {
        totalSellers: sellers.length,
        approved: sellers.filter(s => s.status === 'approved').length,
        avgRating: sellers.length ? Number((sellers.reduce((sum, s) => sum + (s.avgRating || 0), 0) / sellers.length).toFixed(1)) : 0,
      },
    });
  }

  if (type === 'products') {
    const products = await Product.find({ createdAt: { $gte: from, $lte: to } })
      .populate('sellerId', 'shopName')
      .sort('-createdAt');
    const data = products.map(p => ({
      name: p.name, category: p.category, seller: p.sellerId?.shopName || 'growthkarts',
      price: p.price, stock: p.stock, rating: p.ratings || 0, reviews: p.numReviews || 0,
    }));
    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const chartData = bucketByDay(products, 'createdAt', from, to).map(d => ({ date: d.date, value: d.count }));
    return res.json({
      success: true, data, chartData,
      summary: {
        totalProducts: products.length, totalStock,
        avgRating: products.length ? Number((products.reduce((sum, p) => sum + (p.ratings || 0), 0) / products.length).toFixed(1)) : 0,
      },
    });
  }

  if (type === 'customers') {
    const users = await User.find({ role: 'user', createdAt: { $gte: from, $lte: to } }).sort('-createdAt');
    const data = users.map(u => ({
      name: u.name, email: u.email, phone: u.phone || '—',
      joined: u.createdAt.toISOString().slice(0, 10), active: u.isActive ? 'Yes' : 'No',
    }));
    const chartData = bucketByDay(users, 'createdAt', from, to).map(d => ({ date: d.date, value: d.count }));
    return res.json({
      success: true, data, chartData,
      summary: { totalCustomers: users.length, active: users.filter(u => u.isActive).length },
    });
  }

  return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
};

// ── Inventory Management ────────────────────────────────────────────────────────
// Platform-wide stock view across every seller's products (and the platform's
// own admin-listed products). Same ≤5-units "low stock" threshold used
// elsewhere (dashboard alert, seller's own Inventory page).
const LOW_STOCK_THRESHOLD = 5;

exports.getInventory = async (req, res) => {
  const { search, stockStatus, sellerId, from, to, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (sellerId) filter.sellerId = sellerId;
  if (stockStatus === 'out') filter.stock = 0;
  else if (stockStatus === 'low') filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
  else if (stockStatus === 'in') filter.stock = { $gt: LOW_STOCK_THRESHOLD };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total, totalProducts, outOfStock, lowStock, unitsAgg] = await Promise.all([
    Product.find(filter)
      .select('name images stock sku category sellerId variants')
      .populate('sellerId', 'shopName')
      .sort('stock')
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(filter),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Product.countDocuments({ isActive: true, stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, total: { $sum: '$stock' } } }]),
  ]);

  res.json({
    success: true,
    products,
    total,
    pages: Math.ceil(total / limit),
    stats: { totalProducts, outOfStock, lowStock, totalUnits: unitsAgg[0]?.total || 0 },
  });
};

exports.updateProductStock = async (req, res) => {
  const { stock } = req.body;
  if (stock === undefined || stock < 0) {
    return res.status(400).json({ success: false, message: 'Stock must be a non-negative number' });
  }
  const product = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
};

// POST /api/v1/admin/users — Admin / Super Admin adds a customer account
// directly (e.g. for someone ordering over the phone). The customer can log
// in with the email + password given here and change the password later.
exports.createCustomer = async (req, res) => {
  const { sendMail, isConfigured: mailConfigured } = require('../services/mailer');
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').replace(/[\s()-]/g, '');
  const { password, sendEmail } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, mobile number and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email' });
  if (String(password).length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'This email is already registered' });
  if (await User.findOne({ phone })) return res.status(400).json({ success: false, message: 'This mobile number is already registered' });

  const user = await User.create({ name, email, phone, password, role: 'user', isActive: true });

  let emailSent = false;
  if (sendEmail !== false && mailConfigured()) {
    try {
      await sendMail({
        to: email,
        subject: 'Your growthkarts account is ready',
        heading: 'Welcome to growthkarts',
        paragraphs: [
          `Hello ${name},`,
          'An account has been created for you on growthkarts. Sign in with this email address and the password shared with you, then change the password from My Account.',
        ],
        button: { label: 'Sign in', path: '/login' },
        footer: 'You received this email because an account was created for this address on growthkarts.',
      });
      emailSent = true;
    } catch (err) { console.error('Customer welcome email failed:', err.message); }
  }

  const { password: _pw, ...safe } = user.toObject();
  res.status(201).json({ success: true, message: `${name} added as a customer`, user: safe, emailSent });
};
