const CourierPartner = require('../models/CourierPartner');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Notification = require('../models/Notification');
const CourierSellerPayment = require('../models/CourierSellerPayment');
const Seller = require('../models/Seller');

const normalizeEmail = email => String(email || '').trim().toLowerCase();

const getDuplicateEmailMessage = role => {
  if (role === 'seller') return 'This email is already registered as a seller account. Use a different email for the courier.';
  if (role === 'courier') return 'This email is already registered as a courier account.';
  return 'This email is already registered. Use a different email for the courier.';
};

const ensureCourierSellerSettlements = async (order, courierId) => {
  if (String(order.paymentMethod || '').toLowerCase() !== 'cod' || order.status !== 'delivered') return;
  const productIds = order.items.map(item => item.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } }).select('sellerId');
  const sellerByProduct = new Map(products.map(product => [product._id.toString(), product.sellerId]));
  const sellerIds = [...new Set(order.items
    .map(item => (item.seller || sellerByProduct.get(item.product?.toString()))?.toString())
    .filter(Boolean))];
  if (!sellerIds.length) return;
  const sellers = await Seller.find({ _id: { $in: sellerIds } }).select('shopName bankDetails upiId qrCodeImage courierSettlementMode');
  const sellerMap = new Map(sellers.map(seller => [seller._id.toString(), seller]));
  await Promise.all(sellerIds.map(async sellerId => {
    const seller = sellerMap.get(sellerId);
    if (!seller) return;
    const amount = order.items
      .filter(item => (item.seller || sellerByProduct.get(item.product?.toString()))?.toString() === sellerId)
      .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    const fields = {
      courier: courierId,
      amount,
      bankDetails: {
        ...(seller.bankDetails?.toObject?.() || seller.bankDetails || {}),
        upiId: seller.upiId || '',
        qrCodeImage: seller.qrCodeImage || '',
      },
      settlementMode: seller.courierSettlementMode || 'online',
    };
    await CourierSellerPayment.updateOne(
      { order: order._id, seller: seller._id },
      { $setOnInsert: { ...fields, status: 'pending' } },
      { upsert: true }
    );
    // Follow the seller's current settings only until the courier acts on it.
    await CourierSellerPayment.updateOne({ order: order._id, seller: seller._id, status: 'pending' }, { $set: fields });
  }));
};

exports.getApprovedCouriers = async (req, res) => {
  const couriers = await CourierPartner.find({ status: 'approved', isAvailable: true }).populate('user', 'name email phone');
  res.json({ success: true, couriers });
};

exports.getAllCouriers = async (req, res) => {
  // Direct assignment is the platform rule now, so legacy `pending` courier
  // records are normalized to `approved` before they reach the admin list.
  await CourierPartner.updateMany({ status: 'pending' }, { $set: { status: 'approved' } });
  const couriers = await CourierPartner.find().sort('-createdAt')
    .populate('user', 'name email phone isActive')
    .populate('seller', 'shopName');
  const withCounts = await Promise.all(couriers.map(async (courier) => {
    const [assignedCount, deliveredCount] = await Promise.all([
      Order.countDocuments({ assignedCourier: courier._id }),
      Order.countDocuments({ assignedCourier: courier._id, status: 'delivered' }),
    ]);
    return { ...courier.toObject(), assignedCount, deliveredCount };
  }));
  res.json({ success: true, couriers: withCounts });
};

exports.updateCourierStatus = async (req, res) => {
  const { status, perDeliveryFee } = req.body;
  if (!['pending', 'approved', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  const update = { status };
  if (perDeliveryFee !== undefined) update.perDeliveryFee = Number(perDeliveryFee) || 0;
  const courier = await CourierPartner.findByIdAndUpdate(req.params.id, update, { new: true }).populate('user', 'name email phone');
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });
  res.json({ success: true, courier });
};

// ADMIN/SUPERADMIN: edit an existing courier's details — name/phone live on
// the linked User, vehicle/fee live on the CourierPartner itself.
exports.updateCourier = async (req, res) => {
  const { name, phone, vehicleType, vehicleNumber, perDeliveryFee } = req.body;
  const courier = await CourierPartner.findById(req.params.id);
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });

  if (name !== undefined || phone !== undefined) {
    await User.findByIdAndUpdate(courier.user, {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    });
  }
  if (vehicleType !== undefined) courier.vehicleType = vehicleType;
  if (vehicleNumber !== undefined) courier.vehicleNumber = vehicleNumber;
  if (perDeliveryFee !== undefined) courier.perDeliveryFee = Number(perDeliveryFee) || 0;
  await courier.save();

  res.json({ success: true, courier: await courier.populate('user', 'name email phone isActive') });
};

// ADMIN/SUPERADMIN: block/unblock a courier's login — reuses the same
// `User.isActive` flag every other block/unblock action in the app uses
// (checked in authController on login), so a blocked courier simply can't
// sign in until unblocked, without losing their delivery history.
exports.toggleCourierBlock = async (req, res) => {
  const courier = await CourierPartner.findById(req.params.id).populate('user', 'name email phone isActive');
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });
  const user = await User.findById(courier.user._id);
  user.isActive = !user.isActive;
  await user.save();
  courier.user.isActive = user.isActive;
  res.json({ success: true, courier, message: user.isActive ? 'Courier unblocked' : 'Courier blocked' });
};

// ADMIN/SUPERADMIN: delete a courier — removes both the CourierPartner
// record and its login (User); orders keep their historical
// assignedCourier reference for records, just pointing at a now-deleted doc.
exports.deleteCourier = async (req, res) => {
  const courier = await CourierPartner.findById(req.params.id);
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });
  await User.findByIdAndDelete(courier.user);
  await courier.deleteOne();
  res.json({ success: true, message: 'Courier deleted' });
};

exports.assignCourier = async (req, res) => {
  const courier = await CourierPartner.findOne({ _id: req.body.courierId, status: 'approved' });
  if (!courier) return res.status(404).json({ success: false, message: 'Approved courier not found' });
  const order = await Order.findByIdAndUpdate(req.params.id, {
    assignedCourier: courier._id,
    courierCompany: req.body.courierCompany || 'growthkarts Delivery',
    trackingNumber: req.body.trackingId || undefined,
    status: 'ready_for_pickup',
  }, { new: true });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  await Notification.create({
    title: 'New Delivery Assigned',
    message: `Order #${order.orderNumber} has been assigned to you for delivery.`,
    type: 'push',
    targetUser: courier.user,
    relatedOrder: order._id,
  });
  res.json({ success: true, order });
};

exports.getMyCourierProfile = async (req, res) => {
  await req.courier.populate('seller', 'shopName');
  res.json({ success: true, courier: req.courier });
};

// COURIER: update their own vehicle details, availability and current area.
// Fee and approval status stay admin/seller controlled.
exports.updateMyCourierProfile = async (req, res) => {
  const { vehicleType, vehicleNumber, isAvailable, currentLocation } = req.body;
  const courier = req.courier;
  if (vehicleType !== undefined) courier.vehicleType = String(vehicleType).trim() || 'Bike';
  if (vehicleNumber !== undefined) courier.vehicleNumber = String(vehicleNumber).trim().toUpperCase();
  if (isAvailable !== undefined) courier.isAvailable = !!isAvailable;
  if (currentLocation !== undefined) courier.currentLocation = String(currentLocation).trim();
  await courier.save();
  await courier.populate('seller', 'shopName');
  res.json({ success: true, courier });
};

exports.getCourierOrders = async (req, res) => {
  const orders = await Order.find({ assignedCourier: req.courier._id }).sort('-updatedAt').populate('user', 'name email phone');
  await Promise.all(orders.map(order => ensureCourierSellerSettlements(order, req.courier._id)));
  const settlements = await CourierSellerPayment.find({ order: { $in: orders.map(order => order._id) } })
    .populate('seller', 'shopName');
  res.json({ success: true, orders, settlements });
};

exports.updateCourierOrder = async (req, res) => {
  const allowed = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid delivery status' });
  const order = await Order.findOne({ _id: req.params.id, assignedCourier: req.courier._id });
  if (!order) return res.status(404).json({ success: false, message: 'Assigned order not found' });
  // Delivered / cancelled / returned orders are closed — a courier must not
  // reopen them (a delivered COD order already created seller settlements).
  if (['delivered', 'cancelled', 'returned', 'refunded'].includes(order.status)) {
    return res.status(400).json({ success: false, message: `Order is already ${order.status} and can no longer be updated` });
  }
  // Forward-only along the delivery flow (failed_delivery allowed any time).
  const FLOW = ['ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
  const from = FLOW.indexOf(order.status);
  const to = FLOW.indexOf(req.body.status);
  if (req.body.status !== 'failed_delivery' && from !== -1 && to <= from) {
    return res.status(400).json({ success: false, message: `Cannot move order back from ${order.status.replace(/_/g, ' ')} to ${req.body.status.replace(/_/g, ' ')}` });
  }
  order.status = req.body.status;
  if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;
  if (req.body.status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }
  await order.save();
  await ensureCourierSellerSettlements(order, req.courier._id);
  const settlements = await CourierSellerPayment.find({ courier: req.courier._id, order: order._id }).populate('seller', 'shopName');
  res.json({ success: true, order, settlements });
};

exports.submitSellerPayment = async (req, res) => {
  const { proofUrl, courierNote } = req.body;
  const payment = await CourierSellerPayment.findOne({ _id: req.params.id, courier: req.courier._id });
  if (!payment) return res.status(404).json({ success: false, message: 'Seller payment task not found' });
  if (payment.status === 'approved') return res.status(400).json({ success: false, message: 'This payment is already approved' });
  if (payment.settlementMode === 'manual') {
    return res.status(400).json({ success: false, message: 'Manual payments are confirmed by the seller after receiving the cash' });
  }
  if (!proofUrl) {
    return res.status(400).json({ success: false, message: 'Payment screenshot is required for online settlement' });
  }
  payment.proofUrl = proofUrl;
  payment.courierNote = courierNote || '';
  payment.status = 'submitted';
  payment.rejectedAt = undefined;
  payment.submittedAt = new Date();
  await payment.save();
  const seller = await Seller.findById(payment.seller);
  const order = await Order.findById(payment.order).select('orderNumber');
  if (seller?.user) {
    await Notification.create({
      title: 'COD payment proof submitted',
      message: `Courier submitted ₹${payment.amount} payment proof for order #${order?.orderNumber || payment.order}.`,
      type: 'push',
      targetUser: seller.user,
      relatedOrder: payment.order,
    });
  }
  res.json({ success: true, payment });
};

exports.createCourier = async (req, res) => {
  const { name, email, password, phone, vehicleType, vehicleNumber, perDeliveryFee } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  const normalizedEmail = normalizeEmail(email);
  const existing = await User.findOne({ email: normalizedEmail }).select('role');
  if (existing) return res.status(400).json({ success: false, message: getDuplicateEmailMessage(existing.role) });
  const user = await User.create({ name, email: normalizedEmail, password, phone, role: 'courier' });
  try {
    const courier = await CourierPartner.create({ user: user._id, vehicleType, vehicleNumber, perDeliveryFee: Number(perDeliveryFee) || 0, status: 'approved' });
    res.status(201).json({ success: true, courier: await courier.populate('user', 'name email phone') });
  } catch (err) {
    // Don't leave an orphaned login behind if the courier record itself
    // fails to save — otherwise this email is permanently stuck reporting
    // "already exists" with no way to ever finish creating a real courier.
    await User.findByIdAndDelete(user._id);
    throw err;
  }
};

// A seller registering their own delivery partner — kept separate from the
// admin's own couriers (`seller` stays null there). Auto-approved on
// creation so the seller can assign it to orders immediately, with no
// Admin/Super Admin approval step required.
exports.createSellerCourier = async (req, res) => {
  const { name, email, password, phone, vehicleType, vehicleNumber, perDeliveryFee } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  const normalizedEmail = normalizeEmail(email);
  const existing = await User.findOne({ email: normalizedEmail }).select('role');
  if (existing) return res.status(400).json({ success: false, message: getDuplicateEmailMessage(existing.role) });
  const user = await User.create({ name, email: normalizedEmail, password, phone, role: 'courier' });
  try {
    const courier = await CourierPartner.create({ user: user._id, vehicleType, vehicleNumber, perDeliveryFee: Number(perDeliveryFee) || 0, seller: req.seller._id, status: 'approved' });
    res.status(201).json({ success: true, courier: await courier.populate('user', 'name email phone') });
  } catch (err) {
    // Don't leave an orphaned login behind if the courier record itself
    // fails to save — otherwise this email is permanently stuck reporting
    // "already exists" with no way to ever finish creating a real courier.
    await User.findByIdAndDelete(user._id);
    throw err;
  }
};

exports.getMySellerCouriers = async (req, res) => {
  const couriers = await CourierPartner.find({ seller: req.seller._id }).sort('-createdAt').populate('user', 'name email phone');
  res.json({ success: true, couriers });
};

// SELLER: edit one of their own couriers — scoped by `seller` so a seller
// can never touch another seller's (or the platform's) courier.
exports.updateSellerCourier = async (req, res) => {
  const { name, phone, vehicleType, vehicleNumber, perDeliveryFee } = req.body;
  const courier = await CourierPartner.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found in your account' });

  if (name !== undefined || phone !== undefined) {
    await User.findByIdAndUpdate(courier.user, {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    });
  }
  if (vehicleType !== undefined) courier.vehicleType = vehicleType;
  if (vehicleNumber !== undefined) courier.vehicleNumber = vehicleNumber;
  if (perDeliveryFee !== undefined) courier.perDeliveryFee = Number(perDeliveryFee) || 0;
  await courier.save();

  res.json({ success: true, courier: await courier.populate('user', 'name email phone isActive') });
};

// SELLER: block/unblock their own courier's login.
exports.toggleSellerCourierBlock = async (req, res) => {
  const courier = await CourierPartner.findOne({ _id: req.params.id, seller: req.seller._id }).populate('user', 'name email phone isActive');
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found in your account' });
  const user = await User.findById(courier.user._id);
  user.isActive = !user.isActive;
  await user.save();
  courier.user.isActive = user.isActive;
  res.json({ success: true, courier, message: user.isActive ? 'Courier unblocked' : 'Courier blocked' });
};

// SELLER: delete their own courier.
exports.deleteSellerCourier = async (req, res) => {
  const courier = await CourierPartner.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!courier) return res.status(404).json({ success: false, message: 'Courier not found in your account' });
  await User.findByIdAndDelete(courier.user);
  await courier.deleteOne();
  res.json({ success: true, message: 'Courier deleted' });
};

exports.assignSellerCourier = async (req, res) => {
  const courier = await CourierPartner.findOne({ _id: req.body.courierId, seller: req.seller._id, status: 'approved' });
  if (!courier) return res.status(404).json({ success: false, message: 'Approved courier not found in your account' });
  // Same ownership check as updateSellerOrderStatus — a checkout can mix
  // items from several sellers into one Order, so `items.seller` (not the
  // order's own top-level `seller`) is what actually scopes it to this seller.
  const order = await Order.findOneAndUpdate({ _id: req.params.id, 'items.seller': req.seller._id }, {
    assignedCourier: courier._id,
    courierCompany: req.body.courierCompany || 'growthkarts Delivery',
    trackingNumber: req.body.trackingId || undefined,
    status: 'ready_for_pickup',
  }, { new: true });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  await Notification.create({
    title: 'New Delivery Assigned',
    message: `Order #${order.orderNumber} has been assigned to you for delivery.`,
    type: 'push',
    targetUser: courier.user,
    relatedOrder: order._id,
  });
  res.json({ success: true, order });
};