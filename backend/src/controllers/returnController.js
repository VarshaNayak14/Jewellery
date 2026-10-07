const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CourierPartner = require('../models/CourierPartner');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { creditWallet } = require('../services/walletService');

const MAX_RETURN_IMAGES = 5;
const MAX_RETURN_VIDEOS = 2;

const cleanMediaUrls = (urls, max) => {
  if (!Array.isArray(urls)) return [];
  const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
  return [...new Set(urls.filter((u) => typeof u === 'string' && u.startsWith(prefix)))].slice(0, max);
};

// USER: Submit return request
exports.createReturn = async (req, res) => {
  const { orderId, productId, reason, description, images, videos } = req.body;
  const selectedRefundMethod = 'wallet';
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Not authorized' });
  if (order.status !== 'delivered')
    return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });

  const existing = await Return.findOne({ order: orderId, product: productId, user: req.user._id });
  if (existing) return res.status(400).json({ success: false, message: 'Return request already submitted for this product' });

  const orderItem = order.items.find(i => i.product.toString() === productId);
  if (!orderItem) return res.status(404).json({ success: false, message: 'Product not found in this order' });

  const product = await Product.findById(productId).select('returnAvailable returnDays refundAvailable refundDays sellerId');
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  if (product.returnAvailable === false || product.refundAvailable === false) {
    return res.status(400).json({ success: false, message: 'This product does not support returns or refunds' });
  }

  const sellerId = product.sellerId || orderItem.seller || null;
  const returnDays = Number(product.returnDays ?? product.refundDays ?? 7);
  if (returnDays > 0) {
    const deliveredAt = order.deliveredAt || order.updatedAt || order.createdAt;
    const allowedUntil = new Date(deliveredAt.getTime() + (returnDays * 24 * 60 * 60 * 1000));
    if (new Date() > allowedUntil) {
      return res.status(400).json({ success: false, message: `Return window expired. Returns are allowed within ${returnDays} days of delivery.` });
    }
  }

  const unitPrice = Number(orderItem.price || 0);
  const quantity = Number(orderItem.quantity || 1);
  const refundAmount = unitPrice * quantity;

  const returnReq = await Return.create({
    order: orderId,
    user: req.user._id,
    product: productId,
    seller: sellerId,
    reason,
    description,
    images: cleanMediaUrls(images, MAX_RETURN_IMAGES),
    videos: cleanMediaUrls(videos, MAX_RETURN_VIDEOS),
    refundMethod: selectedRefundMethod,
    refundAmount,
    trackingHistory: [{ status: 'pending', note: 'Return request submitted by customer' }],
  });

  const notificationTarget = sellerId
    ? await Seller.findById(sellerId).select('user')
    : await User.findOne({ role: 'superadmin' }).select('_id');
  if (notificationTarget?.user || notificationTarget?._id) {
    await Notification.create({
      title: 'New Return Request',
      message: `Return request submitted for order #${order.orderNumber}`,
      type: 'push',
      targetUser: notificationTarget.user || notificationTarget._id,
      relatedOrder: order._id,
      relatedReturn: returnReq._id,
    });
  }

  res.status(201).json({ success: true, return: returnReq });
};

// USER: Get my returns
exports.getMyReturns = async (req, res) => {
  const returns = await Return.find({ user: req.user._id })
    .sort('-createdAt')
    .populate('order', 'orderNumber')
    .populate('product', 'name images');
  res.json({ success: true, returns });
};

// ADMIN: Get all returns
exports.getAllReturns = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { status } : {};
  const platformProductIds = await Product.find({ sellerId: null }).distinct('_id');
  query.$or = [{ seller: null }, { product: { $in: platformProductIds } }];
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [returns, total] = await Promise.all([
    Return.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('user', 'name email')
      .populate('order', 'orderNumber totalPrice items')
      .populate('product', 'name images sellerId')
      .populate({ path: 'assignedCourier', populate: { path: 'user', select: 'name phone' } }),
    Return.countDocuments(query),
  ]);
  res.json({ success: true, returns, total });
};

// ADMIN: Update return status
exports.updateReturnStatus = async (req, res) => {
  const { status, adminNotes, refundAmount, refundMethod } = req.body;
  const returnReq = await Return.findById(req.params.id);
  if (!returnReq) return res.status(404).json({ success: false, message: 'Return not found' });

  returnReq.status = status;
  if (adminNotes) returnReq.adminNotes = adminNotes;
  if (refundAmount !== undefined) returnReq.refundAmount = Number(refundAmount) || 0;
  if (refundMethod) returnReq.refundMethod = refundMethod;

  returnReq.trackingHistory.push({ status, note: adminNotes || `Status updated to ${status}`, updatedBy: req.user._id });

  if (status === 'approved' || status === 'refund_initiated' || status === 'refund_completed') {
    returnReq.refundMethod = 'wallet';
  }

  if (status === 'refund_completed') {
    returnReq.refundedAt = new Date();

    const order = await Order.findById(returnReq.order);
    if (order) {
      order.status = 'refunded';
      if (!order.isDelivered) {
        order.isDelivered = true;
        order.deliveredAt = order.deliveredAt || new Date();
      }
      await order.save();
    }

    if ((returnReq.refundMethod === 'wallet' || returnReq.refundMethod === 'original_payment') && returnReq.refundAmount > 0) {
      await creditWallet(returnReq.user, returnReq.refundAmount, 'Refund for returned product', { returnId: returnReq._id });
    }
  }

  await returnReq.save();

  await Notification.create({
    title: 'Return Update',
    message: `Your return request status: ${status.replace(/_/g, ' ')}`,
    type: 'push',
    targetUser: returnReq.user,
    relatedOrder: returnReq.order,
    relatedReturn: returnReq._id,
  });

  res.json({ success: true, return: returnReq });
};

// ADMIN: Return dashboard stats
exports.getReturnStats = async (req, res) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
    return res.json({ success: true, stats: { pending: 0, approved: 0, rejected: 0, refunded: 0 } });
  }

  const [pending, approved, rejected, refunded] = await Promise.all([
    Return.countDocuments({ status: 'pending' }),
    Return.countDocuments({ status: 'approved' }),
    Return.countDocuments({ status: 'rejected' }),
    Return.countDocuments({ status: 'refund_completed' }),
  ]);
  res.json({ success: true, stats: { pending, approved, rejected, refunded } });
};

// SELLER: Get return requests for seller's products
exports.getSellerReturns = async (req, res) => {
  const ownedProductIds = await Product.find({ sellerId: req.seller._id }).distinct('_id');
  const returns = await Return.find({
    $or: [
      { seller: req.seller._id },
      { product: { $in: ownedProductIds } },
    ],
  })
    .sort('-createdAt')
    .populate('user', 'name email')
    .populate('order', 'orderNumber totalPrice items')
    .populate('product', 'name images sellerId')
    .populate({ path: 'assignedCourier', populate: { path: 'user', select: 'name phone' } });
  res.json({ success: true, returns });
};

const assignReturnCourier = async (req, res, seller) => {
  const courierQuery = { _id: req.body.courierId, status: 'approved', isAvailable: true };
  if (seller) courierQuery.seller = seller;
  else courierQuery.seller = null;
  const courier = await CourierPartner.findOne(courierQuery);
  if (!courier) return res.status(404).json({ success: false, message: 'Approved courier not found' });

  const ownedProductIds = seller ? await Product.find({ sellerId: seller }).distinct('_id') : await Product.find({ sellerId: null }).distinct('_id');
  const returnReq = await Return.findOne({
    _id: req.params.id,
    $or: seller ? [{ seller }, { product: { $in: ownedProductIds } }] : [{ seller: null }, { product: { $in: ownedProductIds } }],
  });
  if (!returnReq) return res.status(404).json({ success: false, message: 'Return request not found' });
  if (!['approved', 'pickup_scheduled'].includes(returnReq.status)) {
    return res.status(400).json({ success: false, message: 'Approve the return before assigning a courier' });
  }
  returnReq.assignedCourier = courier._id;
  returnReq.assignedAt = new Date();
  returnReq.status = 'pickup_scheduled';
  returnReq.trackingHistory.push({ status: 'pickup_scheduled', note: 'Courier assigned for return pickup', updatedBy: req.user._id });
  await returnReq.save();
  await Notification.create({
    title: 'New Return Pickup Assigned',
    message: `Return pickup for order #${returnReq.order} has been assigned to you.`,
    type: 'push',
    targetUser: courier.user,
    relatedOrder: returnReq.order,
    relatedReturn: returnReq._id,
  });
  res.json({ success: true, return: await returnReq.populate({ path: 'assignedCourier', populate: { path: 'user', select: 'name phone' } }) });
};

exports.assignSellerReturnCourier = (req, res) => assignReturnCourier(req, res, req.seller._id);
exports.assignAdminReturnCourier = (req, res) => assignReturnCourier(req, res, null);

exports.getCourierReturns = async (req, res) => {
  const returns = await Return.find({ assignedCourier: req.courier._id })
    .sort('-updatedAt').populate('user', 'name phone email').populate('order', 'orderNumber shippingAddress')
    .populate('product', 'name images');
  res.json({ success: true, returns });
};

exports.updateCourierReturnStatus = async (req, res) => {
  const { status, note } = req.body;
  if (!['picked_up', 'approved'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid return status' });
  const returnReq = await Return.findOne({ _id: req.params.id, assignedCourier: req.courier._id });
  if (!returnReq) return res.status(404).json({ success: false, message: 'Assigned return not found' });
  if (status === 'picked_up') {
    returnReq.pickedUpAt = new Date();
    returnReq.status = 'picked_up';
  } else if (!returnReq.refundedAt) {
    returnReq.status = 'refund_completed';
    returnReq.refundedAt = new Date();
    await creditWallet(returnReq.user, returnReq.refundAmount, 'Refund for returned product', { returnId: returnReq._id });
  }
  returnReq.trackingHistory.push({ status: returnReq.status, note: note || `Courier updated return to ${returnReq.status}`, updatedBy: req.user._id });
  await returnReq.save();
  await Notification.create({ title: 'Return Update', message: `Your return status: ${returnReq.status.replace(/_/g, ' ')}`, type: 'push', targetUser: returnReq.user, relatedOrder: returnReq.order, relatedReturn: returnReq._id });
  res.json({ success: true, return: returnReq });
};

exports.updateSellerReturnStatus = async (req, res) => {
  const { status, adminNotes } = req.body;
  const allowed = ['under_review', 'approved', 'rejected', 'pickup_scheduled'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid return status' });
  const ownedProductIds = await Product.find({ sellerId: req.seller._id }).distinct('_id');
  const returnReq = await Return.findOne({
    _id: req.params.id,
    $or: [
      { seller: req.seller._id },
      { product: { $in: ownedProductIds } },
    ],
  });
  if (!returnReq) return res.status(404).json({ success: false, message: 'Return request not found' });
  returnReq.status = status;
  if (adminNotes) returnReq.adminNotes = adminNotes;
  returnReq.trackingHistory.push({ status, note: adminNotes || `Seller updated return to ${status}` });
  await returnReq.save();
  await Notification.create({
    title: 'Return Request Update',
    message: `Seller updated return request to ${status.replace(/_/g, ' ')}`,
    type: 'push', targetUser: returnReq.user, relatedOrder: returnReq.order, relatedReturn: returnReq._id,
  });
  res.json({ success: true, return: returnReq });
};
