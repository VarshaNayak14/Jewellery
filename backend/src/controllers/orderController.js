const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const { getOrCreateWallet, debitWallet, creditWallet } = require('../services/walletService');
const { creditSellerEarnings } = require('../services/sellerEarningsService');
const { notifySellerOrder, notifyUserOrder } = require('../utils/notificationUtils');
const { sellerCaps } = require('../utils/planCapabilities');
const { resolveOwners, resolveAdminPaymentTarget, resolveAdminPaymentGroups } = require('../utils/adminPayment');
const { verifyAddress } = require('../utils/pincode');

const findOrderByReference = (reference) => {
  const normalized = decodeURIComponent(String(reference || '')).replace(/^#/, '').trim();
  return /^[a-f\d]{24}$/i.test(normalized)
    ? Order.findById(normalized)
    : Order.findOne({ orderNumber: normalized });
};

const refundOrderToWallet = async (order, amount, reason) => {
  if (!order || !amount || amount <= 0) return;
  await creditWallet(order.user, amount, reason, { orderId: order._id });
};

exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, paymentReference, paymentScreenshot, itemsPrice, shippingPrice, taxPrice, totalPrice, walletAmountUsed } = req.body;

  if (!items || items.length === 0)
    return res.status(400).json({ success: false, message: 'No order items' });

  // The delivery PIN must really belong to the entered district / state.
  const addressCheck = await verifyAddress(shippingAddress);
  if (!addressCheck.ok) return res.status(400).json({ success: false, message: addressCheck.message });
  if (shippingAddress && (shippingAddress.houseNo || shippingAddress.area)) {
    shippingAddress.street = [shippingAddress.houseNo, shippingAddress.area].filter(Boolean).join(', ');
  }

  // Always resolve `seller` per item from the Product itself — never trust
  // a seller id the client might send. This is also what lets us credit the
  // right seller's earnings once the order is paid.
  const productIds = items.map(i => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('sellerId ownerAdmin codAvailable');
  const sellerByProduct = new Map(products.map(p => [p._id.toString(), p.sellerId]));
  const ownerByProduct = await resolveOwners(products);
  for (const item of items) {
    item.seller = sellerByProduct.get(item.product?.toString());
    // Admin / Super Admin who owns this (non-seller) product
    item.ownerAdmin = ownerByProduct.get(item.product?.toString()) || undefined;
  }

  // One order (and one payment) per seller — the checkout splits a mixed
  // cart into per-seller orders, so a mixed order here is never valid.
  const ownerKeys = new Set(items.map(item => (item.seller ? `seller:${item.seller}` : `admin:${item.ownerAdmin || ''}`)));
  if (ownerKeys.size > 1) {
    return res.status(400).json({ success: false, message: 'Items from different sellers must be ordered separately — one order and payment per seller.' });
  }

  if (paymentMethod === 'cod') {
    const codUnavailable = products.some(product => product.codAvailable === false);
    if (codUnavailable) return res.status(400).json({ success: false, message: 'Cash on Delivery is not available for one or more products' });
  }

  // Cap the wallet amount actually applied to what the customer has and owes,
  // so a stale client-side balance can never over-debit the wallet.
  let appliedWalletAmount = 0;
  if (walletAmountUsed > 0) {
    const wallet = await getOrCreateWallet(req.user._id);
    appliedWalletAmount = Math.min(walletAmountUsed, wallet.balance, totalPrice);
  }
  const fullyPaidByWallet = appliedWalletAmount > 0 && appliedWalletAmount >= totalPrice;
  const sellerIds = [...new Set(items.map(item => item.seller?.toString()).filter(Boolean))];
  // A seller whose plan has lapsed (or who isn't approved) is offline — their
  // products can still sit in old carts / links, so block the order here.
  if (sellerIds.length) {
    const unavailable = await Seller.find({
      _id: { $in: sellerIds },
      $or: [{ status: { $ne: 'approved' } }, { planExpiresAt: { $lte: new Date() } }],
    }).select('shopName');
    if (unavailable.length) {
      return res.status(400).json({
        success: false,
        message: `${unavailable.map(s => s.shopName).join(', ')} is not accepting orders right now. Please remove their items from your cart.`,
      });
    }
  }
  let sellerPaymentDetails;
  if (!fullyPaidByWallet && paymentMethod === 'seller_direct') {
    if (sellerIds.length !== 1 || !paymentReference?.trim() || !paymentScreenshot?.trim()) {
      return res.status(400).json({ success: false, message: 'Seller payment reference and screenshot are required' });
    }
    const seller = await Seller.findOne({
      _id: sellerIds[0],
      status: 'approved',
      'kyc.status': 'approved',
    }).select('shopName upiId qrCodeImage planSnapshot');
    if (!seller || (!seller.upiId && !seller.qrCodeImage)) {
      return res.status(400).json({ success: false, message: 'This seller has not completed payment verification yet' });
    }
    if (!sellerCaps(seller).directPayment) {
      return res.status(400).json({ success: false, message: 'Direct UPI / QR payment is not available for this seller. Please choose another payment method.' });
    }
    sellerPaymentDetails = {
      seller: seller._id,
      shopName: seller.shopName,
      upiId: seller.upiId || '',
      qrCodeImage: seller.qrCodeImage || '',
    };
  }

  // Admin / Super Admin products paid online: money goes to the owner admin's
  // own saved UPI / QR / bank details (customer submits UTR + screenshot).
  let adminPaymentDetails;
  if (!fullyPaidByWallet && paymentMethod === 'admin_direct') {
    if (!paymentReference?.trim() || !paymentScreenshot?.trim()) {
      return res.status(400).json({ success: false, message: 'Payment reference and screenshot are required' });
    }
    const target = await resolveAdminPaymentTarget(products.filter(p => productIds.some(id => String(id) === String(p._id))));
    if (!target.available) {
      return res.status(400).json({ success: false, message: 'Direct payment is not available for these items. Please choose another payment method.' });
    }
    adminPaymentDetails = target.details;
  }

  const order = await Order.create({
    user: req.user._id,
    items,
    shippingAddress,
    paymentMethod: fullyPaidByWallet ? 'wallet' : (paymentMethod || 'razorpay'),
    paymentReference: paymentReference?.trim() || '',
    paymentScreenshot: paymentScreenshot?.trim() || '',
    sellerPaymentDetails,
    adminPaymentDetails,
    adminPaymentStatus: adminPaymentDetails ? 'pending' : 'none',
    itemsPrice,
    shippingPrice: shippingPrice || 0,
    taxPrice: taxPrice || 0,
    totalPrice,
    walletAmountUsed: appliedWalletAmount,
    isPaid: fullyPaidByWallet,
    paidAt: fullyPaidByWallet ? new Date() : undefined,
    status: fullyPaidByWallet ? 'confirmed' : 'pending',
  });

  if (appliedWalletAmount > 0) {
    await debitWallet(req.user._id, appliedWalletAmount, `Used for order #${order.orderNumber}`, { orderId: order._id });
  }

  // Wallet fully covered the order — it's paid right now, so credit sellers
  // immediately. (If it needs Razorpay instead, this happens in
  // paymentController.verifyPayment once the payment is confirmed.)
  if (fullyPaidByWallet) {
    await creditSellerEarnings(order);
  }

  // Remove only what was ordered — items from other sellers stay in the
  // cart for their own order and payment.
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    const lineKey = (i) => `${i.product?._id || i.product}|${i.size || ''}|${i.color || ''}`;
    const ordered = new Set(items.map(lineKey));
    cart.items = cart.items.filter(ci => !ordered.has(lineKey(ci)));
    await cart.save();
  }

  await notifySellerOrder(
    order,
    'New Order Received',
    `A new order #${order.orderNumber} has been placed for your products.`
  );
  await notifyUserOrder(
    order,
    'Order Placed',
    `Your order #${order.orderNumber} has been placed successfully.`
  );

  res.status(201).json({ success: true, order, remainingAmount: Math.max(totalPrice - appliedWalletAmount, 0) });
};

exports.getMyOrders = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id }).sort('-createdAt').skip(skip).limit(parseInt(limit)).populate('items.product', 'name images returnAvailable returnDays'),
    Order.countDocuments({ user: req.user._id }),
  ]);
  res.json({ success: true, orders, total });
};

exports.getOrder = async (req, res) => {
  const order = await findOrderByReference(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name images returnAvailable returnDays');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Not authorized' });
  res.json({ success: true, order });
};

exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Not authorized' });
  if (!['pending', 'confirmed'].includes(order.status))
    return res.status(400).json({ success: false, message: 'Cannot cancel this order' });
  order.status = 'cancelled';
  await order.save();

  await notifySellerOrder(
    order,
    'Order Cancelled',
    `Order #${order.orderNumber} was cancelled by the customer.`
  );
  await notifyUserOrder(
    order,
    'Order Cancelled',
    `Your order #${order.orderNumber} has been cancelled.`
  );

  // Refund whatever the customer actually paid back to their wallet — the full
  // amount if the order was fully paid, or just the wallet portion otherwise.
  const refundAmount = order.isPaid ? order.totalPrice : Math.max(order.walletAmountUsed || 0, 0);
  if (refundAmount > 0) {
    await refundOrderToWallet(order, refundAmount, `Refund for cancelled order #${order.orderNumber}`);
  }

  res.json({ success: true, order });
};

exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, from, to, scope } = req.query;
  const query = {};
  if (status) query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  // "platform" = every item is admin's own catalog (no item has a seller);
  // "seller" = at least one item belongs to a marketplace seller. There's no
  // single per-order flag for this — items[].seller is what actually carries
  // it (see sellerController.getSellerOrders for the same pattern).
  if (scope === 'platform') query.items = { $not: { $elemMatch: { seller: { $ne: null } } } };
  else if (scope === 'seller') query['items.seller'] = { $ne: null };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .populate({
        path: 'assignedCourier',
        select: 'vehicleType vehicleNumber currentLocation status isAvailable seller',
        populate: { path: 'user', select: 'name email phone' },
      }),
    Order.countDocuments(query),
  ]);
  res.json({ success: true, orders, total });
};

exports.updateOrderStatus = async (req, res) => {
  const { status, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (status === 'delivered') { order.isDelivered = true; order.deliveredAt = new Date(); }
  if (status === 'cancelled') {
    await refundOrderToWallet(order, Number(order.totalPrice || 0), `Refund for cancelled order #${order.orderNumber}`);
  }
  await order.save();

  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  await notifySellerOrder(
    order,
    `Order ${statusLabel}`,
    `Order #${order.orderNumber} is now ${statusLabel.toLowerCase()}.`
  );
  await notifyUserOrder(
    order,
    `Order ${statusLabel}`,
    `Your order #${order.orderNumber} is now ${statusLabel.toLowerCase()}.`
  );

  res.json({ success: true, order });
};

exports.getOrderTracking = async (req, res) => {
  const order = await findOrderByReference(req.params.id).select('user status trackingNumber courierCompany estimatedDelivery createdAt updatedAt orderNumber');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  const statuses = ['order_placed', 'seller_accepted', 'packed', 'ready_for_pickup', 'picked_up', 'shipped', 'reached_sorting_center', 'in_transit', 'reached_destination_city', 'out_for_delivery', 'delivered'];
  const current = order.status === 'confirmed' ? 'seller_accepted' : order.status;
  const end = Math.max(0, statuses.indexOf(current));
  const trackingHistory = statuses.slice(0, end + 1).map((status, index) => ({
    status,
    timestamp: index === 0 ? order.createdAt : order.updatedAt,
    note: status === 'delivered' ? 'Order delivered' : undefined,
  }));
  res.json({ success: true, trackingHistory, order });
};

// Owner admin (or any super admin) confirms / rejects a customer's direct payment.
exports.reviewAdminPayment = async (req, res) => {
  const { action, note } = req.body;
  if (!['verify', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.paymentMethod !== 'admin_direct' || order.adminPaymentStatus !== 'pending') {
    return res.status(400).json({ success: false, message: 'No pending direct payment on this order' });
  }
  const isOwner = String(order.adminPaymentDetails?.admin) === String(req.user._id);
  if (req.user.role !== 'superadmin' && !isOwner) {
    return res.status(403).json({ success: false, message: 'Only the admin who received this payment can verify it' });
  }

  order.adminPaymentVerifiedBy = req.user._id;
  order.adminPaymentVerifiedAt = new Date();
  order.adminPaymentNote = String(note || '').trim().slice(0, 300);

  if (action === 'verify') {
    order.adminPaymentStatus = 'verified';
    order.isPaid = true;
    order.paidAt = new Date();
    if (order.status === 'pending') order.status = 'confirmed';
    await order.save();
    await notifyUserOrder(order, 'Payment Confirmed', `Your payment for order #${order.orderNumber} has been confirmed.`);
  } else {
    order.adminPaymentStatus = 'rejected';
    order.status = 'cancelled';
    await order.save();
    await refundOrderToWallet(order, Math.max(order.walletAmountUsed || 0, 0), `Refund for cancelled order #${order.orderNumber}`);
    await notifyUserOrder(order, 'Payment Rejected', `We could not verify your payment for order #${order.orderNumber}. The order was cancelled.`);
  }
  res.json({ success: true, order });
};

// Checkout asks: "if the customer pays online for this cart, who receives it?"
// Checkout: admin-catalog products grouped by owning Admin / Super Admin,
// each with the payment details that owner has saved.
exports.getAdminPaymentGroups = async (req, res) => {
  const ids = Array.isArray(req.body.productIds) ? req.body.productIds.filter(Boolean) : [];
  const products = await Product.find({ _id: { $in: ids } }).select('sellerId ownerAdmin');
  res.json({ success: true, groups: await resolveAdminPaymentGroups(products) });
};

exports.getAdminPaymentTarget = async (req, res) => {
  const ids = Array.isArray(req.body.productIds) ? req.body.productIds.filter(Boolean) : [];
  const products = await Product.find({ _id: { $in: ids } }).select('sellerId ownerAdmin');
  const target = await resolveAdminPaymentTarget(products);
  res.json({ success: true, ...target });
};