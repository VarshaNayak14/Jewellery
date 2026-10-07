const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { sellerCaps } = require('../utils/planCapabilities');

// GET /api/v1/seller/analytics
//   ?range=7d|30d|90d|12m          a preset ending today
//   ?month=2026-09                 one calendar month
//   ?from=2026-09-01&to=2026-09-15 custom dates (both inclusive)
// Everything the seller's Growth & Analytics page charts, for one period,
// plus the previous period of the same length for comparison. Only this
// seller's items in each order count. Cancelled / returned / refunded orders
// are shown in the status breakdown but never counted as sales.

const RANGES = { '7d': { days: 7 }, '30d': { days: 30 }, '90d': { days: 90 }, '12m': { months: 12 } };
const NOT_SALES = ['cancelled', 'returned', 'refunded'];
const LOW_STOCK = 5;
const DAY = 86400000;
const MAX_DAYS = 3 * 366;
const IST_MS = 5.5 * 60 * 60 * 1000; // buckets follow the Indian calendar day

const istDate = (d) => new Date(new Date(d).getTime() + IST_MS);
const dayKey = (d) => istDate(d).toISOString().slice(0, 10);
const monthKey = (d) => istDate(d).toISOString().slice(0, 7);
// IST midnight of a calendar date, as a real instant.
const istMidnight = (y, m, d) => new Date(Date.UTC(y, m, d) - IST_MS);
const parseDay = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
  return m ? istMidnight(+m[1], +m[2] - 1, +m[3]) : null;
};

// The period [start, end) from the query, or an error message.
function periodFor(query) {
  const now = new Date();
  const today = istDate(now);
  let start; let end; let label;

  if (query.month) {
    const m = /^(\d{4})-(\d{2})$/.exec(String(query.month));
    if (!m) return { error: 'Month must look like 2026-09' };
    start = istMidnight(+m[1], +m[2] - 1, 1);
    end = istMidnight(+m[1], +m[2], 1);
    label = start.getTime() + IST_MS;
    label = new Date(label).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  } else if (query.from || query.to) {
    start = parseDay(query.from);
    const toDay = parseDay(query.to);
    if (!start || !toDay) return { error: 'Choose both From and To dates' };
    end = new Date(toDay.getTime() + DAY);
    if (end <= start) return { error: 'From date must be on or before To date' };
    if ((end - start) / DAY > MAX_DAYS) return { error: 'Choose a range of 3 years or less' };
    const fmt = (d) => istDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    label = `${fmt(start)} – ${fmt(toDay)}`;
  } else {
    const cfg = RANGES[query.range] || RANGES['12m'];
    end = now;
    start = cfg.months
      ? istMidnight(today.getUTCFullYear(), today.getUTCMonth() - (cfg.months - 1), 1)
      : istMidnight(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (cfg.days - 1));
    label = cfg.months ? `last ${cfg.months} months` : `last ${cfg.days} days`;
  }

  const days = (end - start) / DAY;
  const unit = days <= 62 ? 'day' : days <= 200 ? 'week' : 'month';
  const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  return { unit, start, end, prevStart, label };
}

// Empty buckets for the whole period, so the chart shows quiet days as 0.
function buckets(unit, start, end) {
  const list = [];
  if (unit === 'month') {
    const s = istDate(start);
    for (let i = 0; ; i++) {
      const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1));
      if (d.getTime() - IST_MS >= end.getTime()) break;
      list.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }) });
    }
  } else {
    const step = unit === 'week' ? 7 : 1;
    for (let t = start.getTime(); t < end.getTime(); t += step * DAY) {
      const d = istDate(t);
      list.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) });
    }
  }
  return list.map(x => ({ ...x, revenue: 0, orders: 0 }));
}

exports.getSellerAnalytics = async (req, res) => {
  if (!sellerCaps(req.seller).analytics) {
    return res.status(403).json({ success: false, message: 'Growth & Analytics is not included in your plan' });
  }
  const sellerId = String(req.seller._id);
  const period = periodFor(req.query);
  if (period.error) return res.status(400).json({ success: false, message: period.error });
  const { unit, start, end, prevStart, label } = period;

  const [orders, products, reviewStats] = await Promise.all([
    Order.find({ 'items.seller': req.seller._id, createdAt: { $gte: prevStart, $lt: end } })
      .select('items status paymentMethod createdAt').lean(),
    Product.find({ sellerId: req.seller._id }).select('isActive stock variants').lean(),
    Review.aggregate([
      { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $match: { 'p.sellerId': req.seller._id, isHidden: { $ne: true } } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const series = buckets(unit, start, end);
  const bucketIndex = new Map(series.map((b, i) => [b.key, i]));
  // Weekly buckets: map each day to the week bucket it falls in.
  const weekKeyOf = (d) => {
    const days = Math.floor((new Date(d).getTime() - start.getTime()) / 86400000);
    return series[Math.min(Math.floor(days / 7), series.length - 1)]?.key;
  };

  const current = { orders: 0, revenue: 0, units: 0 };
  const previous = { orders: 0, revenue: 0 };
  const statusCounts = {};
  const payment = { cod: { orders: 0, revenue: 0 }, online: { orders: 0, revenue: 0 } };
  const productMap = new Map();

  for (const order of orders) {
    const mine = (order.items || []).filter(i => String(i.seller) === sellerId);
    if (!mine.length) continue;
    const amount = mine.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const isSale = !NOT_SALES.includes(order.status);
    const inPeriod = new Date(order.createdAt) >= start;

    if (!inPeriod) {
      if (isSale) { previous.orders += 1; previous.revenue += amount; }
      continue;
    }
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    if (!isSale) continue;

    current.orders += 1;
    current.revenue += amount;
    current.units += mine.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

    const key = unit === 'month' ? monthKey(order.createdAt) : unit === 'week' ? weekKeyOf(order.createdAt) : dayKey(order.createdAt);
    const idx = bucketIndex.get(key);
    if (idx !== undefined) { series[idx].revenue += amount; series[idx].orders += 1; }

    const pm = String(order.paymentMethod || '').toLowerCase() === 'cod' ? payment.cod : payment.online;
    pm.orders += 1; pm.revenue += amount;

    for (const item of mine) {
      const k = String(item.product || item.name);
      const p = productMap.get(k) || { name: item.name, image: item.image, units: 0, revenue: 0 };
      p.units += Number(item.quantity) || 1;
      p.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      productMap.set(k, p);
    }
  }

  const stockOf = (p) => (p.variants?.some(v => v.isActive !== false)
    ? p.variants.filter(v => v.isActive !== false).reduce((s, v) => s + (v.stock || 0), 0)
    : p.stock || 0);
  const ratingDist = [5, 4, 3, 2, 1].map(stars => ({ stars, count: reviewStats.find(r => r._id === stars)?.count || 0 }));
  const ratingCount = ratingDist.reduce((s, r) => s + r.count, 0);

  res.json({
    success: true,
    period: { start, end, label, unit },
    summary: {
      ...current,
      avgOrderValue: current.orders ? Math.round(current.revenue / current.orders) : 0,
      previous,
    },
    series: series.map(({ key, label, revenue, orders: n }) => ({ key, label, revenue, orders: n })),
    statusCounts: Object.entries(statusCounts).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    payment: [
      { method: 'Online / UPI', ...payment.online },
      { method: 'Cash on Delivery', ...payment.cod },
    ],
    topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    ratings: {
      count: ratingCount,
      avg: ratingCount ? Number((ratingDist.reduce((s, r) => s + r.stars * r.count, 0) / ratingCount).toFixed(1)) : 0,
      distribution: ratingDist,
    },
    products: {
      total: products.length,
      active: products.filter(p => p.isActive !== false).length,
      outOfStock: products.filter(p => stockOf(p) <= 0).length,
      lowStock: products.filter(p => { const s = stockOf(p); return s > 0 && s <= LOW_STOCK; }).length,
    },
  });
};
