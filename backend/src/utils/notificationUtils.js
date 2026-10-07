const Notification = require('../models/Notification');
const Seller = require('../models/Seller');

async function getOrderSellerUserIds(order) {
  if (!order?.items?.length) return [];

  const sellerIds = [...new Set(
    order.items
      .map(item => item?.seller?.toString())
      .filter(Boolean)
  )];

  if (!sellerIds.length) return [];

  const sellers = await Seller.find({ _id: { $in: sellerIds } }).select('user');
  return sellers
    .map(seller => seller.user?.toString())
    .filter(Boolean);
}

async function notifySellerOrder(order, title, message) {
  if (!order?._id) return [];
  const userIds = await getOrderSellerUserIds(order);
  if (!userIds.length) return [];

  return Notification.insertMany(
    userIds.map(userId => ({
      title,
      message,
      type: 'push',
      targetUser: userId,
      relatedOrder: order._id,
      sentBy: order.user,
    }))
  );
}

async function notifyUserOrder(order, title, message) {
  if (!order?._id || !order.user) return null;

  return Notification.create({
    title,
    message,
    type: 'push',
    targetUser: order.user,
    relatedOrder: order._id,
    sentBy: order.user,
  });
}

async function notifyOrderStatus(order, statusLabel, sellerMessage, userMessage) {
  await notifySellerOrder(order, `Order ${statusLabel}`, sellerMessage);
  await notifyUserOrder(order, `Order ${statusLabel}`, userMessage);
}

module.exports = {
  getOrderSellerUserIds,
  notifySellerOrder,
  notifyUserOrder,
  notifyOrderStatus,
};
