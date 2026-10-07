const Seller = require('../models/Seller');
const Order = require('../models/Order');

// Groups an eligible online/wallet-paid order's items by seller and credits each seller's
// availableBalance / totalEarnings with the full item amount — this
// platform takes no commission, sellers pay only the annual subscription
// fee. COD orders are settled separately by courier payment proof and seller
// approval, so this function must not be called for COD deliveries.
async function creditSellerEarnings(order) {
  if (!order || !order.items?.length) return;
  const claimedOrder = await Order.findOneAndUpdate(
    { _id: order._id, sellerEarningsCredited: { $ne: true } },
    { $set: { sellerEarningsCredited: true, sellerEarningsCreditedAt: new Date() } },
    { new: true }
  );
  if (!claimedOrder) return;
  // Keep a caller's in-memory document in sync when this helper is called
  // before that document is saved by a controller.
  order.sellerEarningsCredited = true;
  order.sellerEarningsCreditedAt = claimedOrder.sellerEarningsCreditedAt;

  // seller -> total item amount (price * quantity) for this order
  const totals = new Map();
  for (const item of claimedOrder.items) {
    if (!item.seller) continue; // safety net — should always be set by now
    const key = item.seller.toString();
    const amount = (item.price || 0) * (item.quantity || 1);
    totals.set(key, (totals.get(key) || 0) + amount);
  }

  for (const [sellerId, grossAmount] of totals.entries()) {
    const seller = await Seller.findById(sellerId);
    if (!seller) continue;

    seller.totalEarnings += grossAmount;
    seller.availableBalance += grossAmount;
    await seller.save();
  }
}

module.exports = { creditSellerEarnings };