const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { getRazorpayInstance, getRazorpayCredentials } = require('../utils/razorpay');
const { creditSellerEarnings } = require('../services/sellerEarningsService');
const { notifySellerOrder, notifyUserOrder } = require('../utils/notificationUtils');

exports.createRazorpayOrder = async (req, res) => {
  const { amount, orderId } = req.body;
  const razorpay = await getRazorpayInstance();
  if (!razorpay) {
    return res.status(503).json({ success: false, message: 'Online payments are not configured yet. Please contact support.' });
  }

  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${orderId}`,
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);

    if (error?.statusCode === 401 || error?.status === 401) {
      return res.status(502).json({
        success: false,
        message: 'Razorpay authentication failed. Please check the Key ID and Key Secret in Super Admin → Payment Settings. Make sure both keys belong to the same mode (Test or Live).',
      });
    }

    return res.status(502).json({
      success: false,
      message: 'Razorpay could not create the payment order. Please check your payment settings and try again.',
    });
  }

  await Payment.create({
    order: orderId,
    user: req.user._id,
    razorpayOrderId: razorpayOrder.id,
    amount,
  });

  const { keyId } = await getRazorpayCredentials();
  res.json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: keyId,
  });
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  const { keySecret } = await getRazorpayCredentials();
  if (!keySecret) {
    return res.status(503).json({ success: false, message: 'Online payments are not configured yet. Please contact support.' });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature)
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });

  const [, order] = await Promise.all([
    Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: 'captured' }
    ),
    Order.findByIdAndUpdate(orderId, {
      isPaid: true,
      paidAt: new Date(),
      status: 'confirmed',
      paymentResult: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
    }, { new: true }),
  ]);

  // Money has now actually landed in the platform's Razorpay account —
  // credit each seller's share into their availableBalance so it shows up
  // on their Earnings page and can be withdrawn to their KYC bank account.
  if (order) {
    await creditSellerEarnings(order);
    await notifySellerOrder(order, 'Payment Received', `Payment has been received for order #${order.orderNumber}.`);
    await notifyUserOrder(order, 'Payment Successful', `Your payment for order #${order.orderNumber} was successful.`);
  }

  res.json({ success: true, message: 'Payment verified successfully' });
};

exports.getPaymentKey = async (req, res) => {
  const { keyId } = await getRazorpayCredentials();
  res.json({ success: true, key: keyId });
};