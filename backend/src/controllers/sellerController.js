const User = require('../models/User');
const Seller = require('../models/Seller');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');
const ReferralBonus = require('../models/ReferralBonus');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getRazorpayInstance, getRazorpayCredentials } = require('../utils/razorpay');
const { creditReferralBonus } = require('../services/referralService');
const { creditWallet } = require('../services/walletService');
const { creditSellerEarnings } = require('../services/sellerEarningsService');
const CourierSellerPayment = require('../models/CourierSellerPayment');
const { normalizeShopName, shopSlugBase } = require('../utils/slug');
const { ensureCategory, canonicalSub } = require('../utils/categoryResolver');
const SiteSettings = require('../models/SiteSettings');

// Plan payments are verified in Subscription Payments (Super Admin, and Admins
// with the "subscriptions" permission). Super Admin also sees every
// admin-role notification, so one notification reaches both.
const notifyPlanTeam = (title, message) => Notification.create({ title, message, type: 'push', targetRole: 'admin' }).catch(() => {});
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// "Other" categories typed by a seller become real Categories (hidden from
// the navbar until an Admin reviews them). Products store the slug.
const applyProductCategory = async (body, shopName) => {
  if (!body.category) return;
  const category = await ensureCategory(body.category, { subCategory: body.subCategory, addedBy: shopName });
  if (!category) return;
  body.category = category.slug;
  if (body.subCategory) body.subCategory = canonicalSub(category, body.subCategory);
};
const { uploadBufferToCloudinary } = require('../utils/cloudinary');
const { publicProductVisibilityQuery } = require('../utils/productVisibility');
const { applyJewelleryPricing } = require('../utils/jewelleryPricing');
const { sellerCaps, snapshotFromPlan, publicSellerView, publicSellerPopulate } = require('../utils/planCapabilities');
const { addDuration, getPlanCredit } = require('../utils/subscription');

const getReferralWithdrawableBalance = async (sellerId) => {
  const [bonuses, withdrawals] = await Promise.all([
    ReferralBonus.find({ referrer: sellerId }).select('bonusAmount'),
    Withdrawal.find({ seller: sellerId, source: 'referral', status: { $ne: 'rejected' } }).select('amount'),
  ]);
  const earned = bonuses.reduce((sum, bonus) => sum + Number(bonus.bonusAmount || 0), 0);
  const withdrawnOrHeld = withdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);
  return Math.max(earned - withdrawnOrHeld, 0);
};

const offerPlanFilter = (planId) => ({
  _id: planId,
  isActive: true,
  $or: [{ purpose: 'offer' }, { purpose: { $exists: false } }],
});

const getOfferPlanPricing = async (seller, plan) => {
  const previousPayment = await SubscriptionPayment.findOne({
    seller: seller._id,
    purpose: 'offer',
    status: 'paid',
  }).sort('-purchasedAt');

  if (!previousPayment) {
    return { originalPrice: plan.price, creditAmount: 0, payableAmount: plan.price, creditPercent: 0 };
  }

  const credit = getPlanCredit(plan.price, previousPayment.amount, previousPayment.purchasedAt);
  const daysSincePurchase = Math.max(0, (Date.now() - new Date(previousPayment.purchasedAt).getTime()) / (1000 * 60 * 60 * 24));
  return {
    originalPrice: plan.price,
    ...credit,
    previousPlanName: previousPayment.planName,
    daysSincePurchase: Math.floor(daysSincePurchase),
  };
};

// Switching to a plan with a lower product limit is only allowed once the
// seller is within it — otherwise they'd keep more live products than the
// plan allows. Returns an error message, or null when the switch is fine.
const productLimitBlock = async (seller, plan) => {
  if (typeof plan.productLimit !== 'number' || plan.productLimit === -1) return null;
  const count = await Product.countDocuments({ sellerId: seller._id });
  if (count <= plan.productLimit) return null;
  return `You have ${count} products but the ${plan.name} plan allows ${plan.productLimit}. Delete ${count - plan.productLimit} product(s) first, or choose a bigger plan.`;
};

const getSellerPlanPricing = async (seller, plan) => {
  const previousPayment = await SubscriptionPayment.findOne({
    seller: seller._id, purpose: 'seller', status: 'paid',
  }).sort('-purchasedAt');
  if (!previousPayment) return { originalPrice: plan.price, creditAmount: 0, payableAmount: plan.price, creditPercent: 0 };
  return {
    originalPrice: plan.price,
    ...getPlanCredit(plan.price, previousPayment.amount, previousPayment.purchasedAt),
    previousPlanName: previousPayment.planName,
    daysSincePurchase: Math.floor(Math.max(0, (Date.now() - new Date(previousPayment.purchasedAt).getTime()) / (1000 * 60 * 60 * 24))),
  };
};

// ── Seller plan-fee payment (Razorpay) ──────────────────────────────────────
// Public — used on the "Become a Seller" Choose Plan step, before the seller
// account exists. Keys come from Super Admin's Settings → Payment (dynamic),
// see utils/razorpay.js.

exports.createPlanPaymentOrder = async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });

  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) return res.status(400).json({ success: false, message: 'Selected plan is not available' });

  const razorpay = await getRazorpayInstance();
  if (!razorpay) {
    return res.status(503).json({ success: false, message: 'Online payment is not set up yet. Please try again later.' });
  }

  let order;
  try {
    order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100),
      currency: 'INR',
      receipt: `seller_plan_${plan._id}_${Date.now()}`,
      notes: { planId: String(plan._id), planName: plan.name },
    });
  } catch (error) {
    console.error('Razorpay seller plan order creation failed:', error);

    if (error?.statusCode === 401 || error?.status === 401) {
      return res.status(502).json({
        success: false,
        message: 'Razorpay authentication failed. Please check the Key ID and Key Secret in Super Admin → Payment Settings. Make sure both keys belong to the same mode (Test or Live).',
      });
    }

    return res.status(502).json({
      success: false,
      message: 'Razorpay could not create the seller plan payment order. Please check your payment settings and try again.',
    });
  }

  const { keyId } = await getRazorpayCredentials();
  res.json({
    success: true,
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: keyId,
    planName: plan.name,
  });
};

exports.verifyPlanPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  const { keySecret } = await getRazorpayCredentials();
  if (!keySecret) return res.status(503).json({ success: false, message: 'Online payment is not set up yet.' });

  const expected = crypto.createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  res.json({ success: true, message: 'Payment verified', razorpay_order_id, razorpay_payment_id, razorpay_signature });
};

const activateOfferPlanAfterPayment = async (seller, plan, pricing, paymentMethod, transactionId) => {
  const offerPlanExpiresAt = addDuration(new Date(), plan);
  seller.offerPlan = plan._id;
  seller.offerPlanSnapshot = { name: plan.name, price: plan.price, bannerLimit: plan.bannerLimit ?? -1 };
  seller.offerPlanStartedAt = new Date();
  seller.offerPlanExpiresAt = offerPlanExpiresAt;
  seller.offerPlanPaymentReference = '';
  seller.offerPlanPaymentScreenshot = '';
  await seller.save();
  await notifyPlanTeam(
    'Offer plan purchased',
    `${seller.shopName} activated the ${plan.name} homepage banner plan (${paymentMethod === 'credit' ? 'using plan credit' : `paid ${inr(pricing.payableAmount)} online`}).`,
  );
  await SubscriptionPayment.create({
    seller: seller._id,
    plan: plan._id,
    planName: plan.name,
    amount: pricing.payableAmount,
    purpose: 'offer',
    status: 'paid',
    paymentMethod,
    transactionId,
    purchasedAt: new Date(),
    expiresAt: offerPlanExpiresAt,
  });
  return { offerPlan: seller.offerPlan, offerPlanSnapshot: seller.offerPlanSnapshot, offerPlanExpiresAt };
};

exports.createOfferPlanPaymentOrder = async (req, res) => {
  const { planId } = req.body;
  const plan = await SubscriptionPlan.findOne(offerPlanFilter(planId));
  if (!plan) return res.status(400).json({ success: false, message: 'Selected offer plan is not available' });
  const pricing = await getOfferPlanPricing(req.seller, plan);
  if (pricing.payableAmount === 0) return res.json({ success: true, freeUpgrade: true, planName: plan.name, pricing });
  const razorpay = await getRazorpayInstance();
  if (!razorpay) return res.status(503).json({ success: false, message: 'Online payment is not set up yet.' });
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(pricing.payableAmount * 100), currency: 'INR',
      receipt: `offer_plan_${plan._id}_${Date.now()}`,
      notes: { planId: String(plan._id), planName: plan.name, purpose: 'offer' },
    });
    const { keyId } = await getRazorpayCredentials();
    res.json({ success: true, razorpayOrderId: order.id, amount: order.amount, currency: order.currency, key: keyId, planName: plan.name, pricing });
  } catch (error) {
    console.error('Razorpay offer plan order creation failed:', error);
    res.status(502).json({ success: false, message: 'Could not create the offer plan payment order. Please check payment settings.' });
  }
};

exports.createSellerPlanPaymentOrder = async (req, res) => {
  const plan = await SubscriptionPlan.findOne({ _id: req.body.planId, isActive: true, purpose: 'seller' });
  if (!plan) return res.status(400).json({ success: false, message: 'Selected seller plan is not available' });
  const limitError = await productLimitBlock(req.seller, plan);
  if (limitError) return res.status(400).json({ success: false, message: limitError });
  const pricing = await getSellerPlanPricing(req.seller, plan);
  if (pricing.payableAmount === 0) return res.json({ success: true, freeUpgrade: true, planName: plan.name, pricing });
  const razorpay = await getRazorpayInstance();
  if (!razorpay) return res.status(503).json({ success: false, message: 'Online payment is not set up yet.' });
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(pricing.payableAmount * 100), currency: 'INR',
      receipt: `seller_renewal_${plan._id}_${Date.now()}`,
      notes: { planId: String(plan._id), planName: plan.name, purpose: 'seller' },
    });
    const { keyId } = await getRazorpayCredentials();
    res.json({ success: true, razorpayOrderId: order.id, amount: order.amount, currency: order.currency, key: keyId, planName: plan.name, pricing });
  } catch (error) {
    console.error('Razorpay seller renewal order creation failed:', error);
    res.status(502).json({ success: false, message: 'Could not create the seller renewal payment order.' });
  }
};

exports.activateSellerPlan = async (req, res) => {
  const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true, purpose: 'seller' });
  if (!plan) return res.status(400).json({ success: false, message: 'Selected seller plan is not available' });
  // Checked when the payment order is created; once money has been paid the
  // plan is always activated, so only guard the free (credit) path here.
  if (!razorpay_payment_id) {
    const limitError = await productLimitBlock(req.seller, plan);
    if (limitError) return res.status(400).json({ success: false, message: limitError });
  }
  const pricing = await getSellerPlanPricing(req.seller, plan);
  if (pricing.payableAmount > 0) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ success: false, message: 'Missing renewal payment details' });
    const { keySecret } = await getRazorpayCredentials();
    const expected = crypto.createHmac('sha256', keySecret || '').update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (!keySecret || expected !== razorpay_signature) return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
  const purchasedAt = new Date();
  const expiresAt = addDuration(purchasedAt, plan);
  req.seller.plan = plan._id;
  req.seller.planSnapshot = snapshotFromPlan(plan);
  req.seller.planPurchasedAt = purchasedAt;
  req.seller.planExpiresAt = expiresAt;
  await req.seller.save();
  await SubscriptionPayment.create({ seller: req.seller._id, plan: plan._id, planName: plan.name, amount: pricing.payableAmount, purpose: 'seller', status: 'paid', paymentMethod: pricing.payableAmount ? 'razorpay' : 'credit', transactionId: razorpay_payment_id || 'plan-credit', purchasedAt, expiresAt });
  await notifyPlanTeam(
    'Seller plan purchased',
    `${req.seller.shopName} activated the ${plan.name} plan${pricing.payableAmount ? ` (paid ${inr(pricing.payableAmount)} online)` : ' using plan credit'}.`,
  );
  res.json({ success: true, message: 'Seller plan activated', seller: req.seller, pricing, expiresAt });
};

exports.activateOfferPlan = async (req, res) => {
  const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!planId) {
    return res.status(400).json({ success: false, message: 'Missing offer plan payment details' });
  }
  const plan = await SubscriptionPlan.findOne(offerPlanFilter(planId));
  if (!plan) return res.status(400).json({ success: false, message: 'Offer plan is no longer available' });
  const pricing = await getOfferPlanPricing(req.seller, plan);
  if (pricing.payableAmount === 0 && !razorpay_order_id) {
    const seller = await activateOfferPlanAfterPayment(req.seller, plan, pricing, 'credit', 'plan-credit');
    return res.json({ success: true, message: 'Offer plan activated using your plan credit', seller, pricing });
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing offer plan payment details' });
  }
  const { keySecret } = await getRazorpayCredentials();
  if (!keySecret) return res.status(503).json({ success: false, message: 'Online payment is not set up yet.' });
  const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ success: false, message: 'Payment verification failed' });

  const seller = await activateOfferPlanAfterPayment(req.seller, plan, pricing, 'razorpay', razorpay_payment_id);
  res.json({ success: true, message: 'Offer plan activated', seller, pricing });
};

exports.submitOfferPlanBankPayment = async (req, res) => {
  const { planId, paymentReference, paymentScreenshot } = req.body;
  if (!planId || !paymentReference || paymentReference.trim().length < 6) {
    return res.status(400).json({ success: false, message: 'Offer plan and valid UTR / transaction reference are required' });
  }
  if (!String(paymentScreenshot || '').trim()) {
    return res.status(400).json({ success: false, message: 'Please upload the payment screenshot' });
  }
  const plan = await SubscriptionPlan.findOne(offerPlanFilter(planId));
  if (!plan) return res.status(400).json({ success: false, message: 'Selected offer plan is not available' });
  const pricing = await getOfferPlanPricing(req.seller, plan);

  const existing = await SubscriptionPayment.findOne({ seller: req.seller._id, plan: plan._id, purpose: 'offer', status: 'pending' });
  if (existing) return res.status(409).json({ success: false, message: 'This offer plan payment is already pending verification' });

  req.seller.offerPlanPaymentReference = paymentReference.trim();
  req.seller.offerPlanPaymentScreenshot = paymentScreenshot || '';
  await req.seller.save();
  await SubscriptionPayment.create({
    seller: req.seller._id, plan: plan._id, planName: plan.name, amount: pricing.payableAmount,
    purpose: 'offer', status: 'pending', paymentMethod: 'bank_qr',
    transactionId: paymentReference.trim(), paymentScreenshot: paymentScreenshot || '',
    purchasedAt: new Date(),
  });
  await notifyPlanTeam(
    'Offer plan payment to verify',
    `${req.seller.shopName} paid ${inr(pricing.payableAmount)} by bank / UPI for the ${plan.name} homepage banner plan (UTR ${paymentReference.trim()}). Verify it in Subscription Payments to activate it.`,
  );
  res.status(201).json({ success: true, message: 'Bank payment submitted. Admin will verify it before activating your offer plan.', pricing });
};

// POST /api/v1/seller/plan-renewal/bank — renew / switch plan via manual
// bank or UPI/QR transfer. Stays pending until Admin verifies it from
// Subscription Payments, which then activates the plan.
exports.submitSellerPlanBankPayment = async (req, res) => {
  const { planId, paymentReference, paymentScreenshot } = req.body;
  if (!planId || !paymentReference || paymentReference.trim().length < 6) {
    return res.status(400).json({ success: false, message: 'Plan and valid UTR / transaction reference are required' });
  }
  if (!String(paymentScreenshot || '').trim()) {
    return res.status(400).json({ success: false, message: 'Please upload the payment screenshot' });
  }
  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true, purpose: 'seller' });
  if (!plan) return res.status(400).json({ success: false, message: 'Selected seller plan is not available' });
  const limitError = await productLimitBlock(req.seller, plan);
  if (limitError) return res.status(400).json({ success: false, message: limitError });

  const existing = await SubscriptionPayment.findOne({ seller: req.seller._id, purpose: 'seller', status: 'pending' });
  if (existing) {
    return res.status(409).json({ success: false, message: `Your ${existing.planName} payment is already waiting for admin verification` });
  }

  const pricing = await getSellerPlanPricing(req.seller, plan);
  await SubscriptionPayment.create({
    seller: req.seller._id, plan: plan._id, planName: plan.name, amount: pricing.payableAmount,
    purpose: 'seller', status: 'pending', paymentMethod: 'bank_qr',
    transactionId: paymentReference.trim(), paymentScreenshot: paymentScreenshot || '',
    purchasedAt: new Date(),
  });
  await notifyPlanTeam(
    'Plan payment to verify',
    `${req.seller.shopName} paid ${inr(pricing.payableAmount)} by bank / UPI for the ${plan.name} plan (UTR ${paymentReference.trim()}). Verify it in Subscription Payments to activate the plan.`,
  );
  res.status(201).json({ success: true, message: 'Bank payment submitted. Admin will verify it and activate your plan.', pricing });
};

// GET /api/v1/seller/plans — "My Plan" page: every active seller plan with
// the price this seller would pay today (after credit), plus their current
// plan, product usage and plan payment history. Works on an expired plan too.
exports.getSellerPlans = async (req, res) => {
  const [plans, productCount, payments, pendingPayment] = await Promise.all([
    SubscriptionPlan.find({ isActive: true, purpose: 'seller' }).sort('order price'),
    Product.countDocuments({ sellerId: req.seller._id }),
    SubscriptionPayment.find({ seller: req.seller._id, purpose: 'seller' }).sort('-createdAt').limit(20)
      .select('planName amount status paymentMethod transactionId purchasedAt expiresAt createdAt'),
    SubscriptionPayment.findOne({ seller: req.seller._id, purpose: 'seller', status: 'pending' })
      .select('plan planName amount transactionId createdAt'),
  ]);
  const pricedPlans = await Promise.all(plans.map(async (plan) => ({
    ...plan.toObject(),
    pricing: await getSellerPlanPricing(req.seller, plan),
  })));
  const s = req.seller;
  res.json({
    success: true,
    plans: pricedPlans,
    current: {
      plan: s.plan,
      planSnapshot: s.planSnapshot,
      planPurchasedAt: s.planPurchasedAt,
      planExpiresAt: s.planExpiresAt,
      expired: !!s.planExpiresAt && s.planExpiresAt <= new Date(),
    },
    productCount,
    payments,
    pendingPayment,
  });
};

exports.getSellerOfferPlans = async (req, res) => {
  const plans = await SubscriptionPlan.find({
    isActive: true,
    $or: [{ purpose: 'offer' }, { purpose: { $exists: false } }],
  }).sort('order price');
  const pricedPlans = await Promise.all(plans.map(async (plan) => ({
    ...plan.toObject(),
    pricing: await getOfferPlanPricing(req.seller, plan),
  })));
  res.json({ success: true, plans: pricedPlans });
};

// Public — screenshot of a manual bank/QR transfer, uploaded on the "Become a
// Seller" payment step before the seller account exists. Returns the URL that
// is later sent along with registerSeller as paymentScreenshot.
exports.uploadPaymentProof = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
  try {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'growthkarts/payment-proofs');
    res.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error('Payment proof upload failed:', error);
    res.status(502).json({ success: false, message: 'Screenshot upload failed. Please try again.' });
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────────

const sendSellerToken = (user, seller, statusCode, res) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Server cannot sign tokens securely.');
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    seller: {
      _id: seller._id,
      shopName: seller.shopName,
      shopSlug: seller.shopSlug,
      logo: seller.logo,
      status: seller.status,
      offerPlan: seller.offerPlan,
      offerPlanSnapshot: seller.offerPlanSnapshot,
      offerPlanExpiresAt: seller.offerPlanExpiresAt,
      plan: seller.plan,
      planSnapshot: seller.planSnapshot,
      planPurchasedAt: seller.planPurchasedAt,
      planExpiresAt: seller.planExpiresAt,
    },
  });
};

exports.registerSeller = async (req, res) => {
  const {
    name, email, password, phone, shopName, shopDescription, address, logo, planId, category, city, tehsil, district, state,
    paymentReference, paymentScreenshot, referralCode,
    gstin, bisRegistration, specialities, yearEstablished,
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
  } = req.body;
  if (!name || !email || !password || !shopName) {
    return res.status(400).json({ success: false, message: 'name, email, password and shopName are required' });
  }
  if (!phone) return res.status(400).json({ success: false, message: 'Mobile number is required' });
  if (!category || !city) {
    return res.status(400).json({ success: false, message: 'Business category and city are required' });
  }
  const businessCategory = await ensureCategory(category, { addedBy: shopName });
  if (!planId) {
    return res.status(400).json({ success: false, message: 'Please select a subscription plan' });
  }

  const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Selected plan is not available' });
  }

  // Only the location level the plan's visibility scope actually uses is
  // required — a district-scope plan (say) never collects a tehsil on the
  // frontend, so demanding one here would reject every valid submission.
  // tehsil < district < state < india, so each scope also needs everything
  // below it (a tehsil-scope plan needs tehsil+district+state, a
  // district-scope plan needs district+state, etc).
  if (plan.visibilityScope === 'tehsil' && (!tehsil || !district || !state)) {
    return res.status(400).json({ success: false, message: 'Tehsil, district and state are required so your shop can be shown to the right customers' });
  }
  if (plan.visibilityScope === 'district' && (!district || !state)) {
    return res.status(400).json({ success: false, message: 'District and state are required so your shop can be shown to the right customers' });
  }
  if (plan.visibilityScope === 'state' && !state) {
    return res.status(400).json({ success: false, message: 'State is required so your shop can be shown to the right customers' });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

  // Referral is optional — an unknown/mistyped code is silently ignored
  // rather than blocking registration; the seller just doesn't get linked.
  let referrer = null;
  if (referralCode && referralCode.trim()) {
    referrer = await Seller.findOne({ referralCode: referralCode.trim().toUpperCase() });
  }

  // Re-verify the Razorpay payment server-side (defense in depth — never
  // trust a payment as "done" just because the frontend says so).
  let paymentVerified = false;
  if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
    const { keySecret } = await getRazorpayCredentials();
    if (keySecret) {
      const expected = crypto.createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      paymentVerified = expected === razorpay_signature;
    }
  }

  // A plan needs either a verified Razorpay payment or a manual bank/QR
  // transfer reference (Admin verifies that one before approving).
  const manualReference = (paymentReference || '').trim();
  if (!paymentVerified && manualReference && !String(paymentScreenshot || '').trim()) {
    return res.status(400).json({ success: false, message: 'Please upload the payment screenshot for your bank / QR transfer' });
  }
  if (!paymentVerified && !manualReference) {
    return res.status(400).json({ success: false, message: 'Please complete the plan payment (Razorpay, or bank/QR transfer with your transaction reference) before submitting' });
  }

  // Create User with role=seller
  const user = await User.create({ name, email, password, phone, role: 'seller' });

  // Generate unique slug
  const cleanShopName = normalizeShopName(shopName);
  const baseSlug = shopSlugBase(cleanShopName);
  let slug = baseSlug;
  let count = 1;
  while (await Seller.findOne({ shopSlug: slug })) {
    slug = `${baseSlug}${count++}`;
  }

  const planPurchasedAt = new Date();
  const planExpiresAt = addDuration(planPurchasedAt, plan);

  // Create Seller profile (status=pending, admin must approve).
  // Registering only submits a request — the seller cannot log in or reach
  // their dashboard until an admin approves the account (see loginSeller below).
  const seller = await Seller.create({
    user: user._id,
    shopName: cleanShopName,
    shopSlug: slug,
    description: shopDescription || '',
    gstin: gstin || '',
    bisRegistration: bisRegistration || '',
    specialities: Array.isArray(specialities) ? specialities.slice(0, 12) : [],
    yearEstablished: Number(yearEstablished) || undefined,
    phone: phone || '',
    address: address || '',
    logo: logo || '',
    category: businessCategory?.name || category,
    city,
    tehsil,
    district,
    state,
    status: 'pending',
    plan: plan._id,
    planSnapshot: snapshotFromPlan(plan),
    planExpiresAt,
    planPurchasedAt,
    paymentReference: paymentVerified ? '' : manualReference,
    paymentScreenshot: paymentVerified ? '' : (paymentScreenshot || ''),
    razorpayOrderId: paymentVerified ? razorpay_order_id : '',
    razorpayPaymentId: paymentVerified ? razorpay_payment_id : '',
    paymentVerified,
    referredBy: referrer?._id,
  });

  // Record the plan purchase for Subscription Payments reporting. Razorpay is
  // already verified, so it counts as paid; a manual bank/QR transfer stays
  // 'pending' until Admin verifies it and approves the seller (see
  // adminSellerController.updateSellerStatus).
  await SubscriptionPayment.create({
    seller: seller._id,
    plan: plan._id,
    planName: plan.name,
    amount: plan.price,
    status: paymentVerified ? 'paid' : 'pending',
    paymentMethod: paymentVerified ? 'razorpay' : 'bank_qr',
    transactionId: paymentVerified ? razorpay_payment_id : manualReference,
    purchasedAt: new Date(),
    expiresAt: planExpiresAt,
  });

  // Referral bonus only once the payment is actually confirmed — for manual
  // transfers that happens when Admin approves the seller.
  if (paymentVerified) await creditReferralBonus(seller);

  // Notify Admin & Super Admin so the request actually reaches their dashboard/notifications.
  await Notification.create({
    title: 'New Seller Registration',
    message: `${shopName} (${name}) has applied for a seller account on the ${plan.name} plan and is awaiting approval.`,
    type: 'push',
    targetRole: 'admin',
  });

  res.status(201).json({
    success: true,
    message: 'Registration request submitted! Your account is pending admin approval.',
    seller: { shopName: seller.shopName, status: seller.status, plan: plan.name },
  });
};

exports.loginSeller = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Please provide email and password' });

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  if (user.role !== 'seller')
    return res.status(403).json({ success: false, message: 'This account is not a seller account' });

  if (!user.isActive)
    return res.status(403).json({ success: false, message: 'Account is deactivated' });

  const seller = await Seller.findOne({ user: user._id });
  if (!seller) return res.status(404).json({ success: false, message: 'Seller profile not found' });

  if (seller.status === 'pending') {
    return res.status(403).json({ success: false, message: 'Your account is pending admin approval', status: 'pending' });
  }
  if (seller.status === 'rejected') {
    return res.status(403).json({ success: false, message: `Your application was rejected. Reason: ${seller.rejectionReason || 'Contact admin'}`, status: 'rejected' });
  }
  if (seller.status === 'blocked') {
    return res.status(403).json({ success: false, message: 'Your account has been blocked. Contact admin.', status: 'blocked' });
  }
  // An expired plan no longer blocks login — the seller panel sends them to
  // "My Plan" to renew, and every other seller endpoint stays blocked
  // (protectSeller) until they do.

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendSellerToken(user, seller, 200, res);
};

exports.getSellerMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  const seller = await Seller.findOne({ user: req.user._id });
  const visibility = seller ? seller.getVisibilityStatus() : null;
  res.json({ success: true, user, seller, visibility });
};

// ── Shop Settings ─────────────────────────────────────────────────────────────

const THEME_OPTIONS = ['classic', 'minimal', 'vibrant', 'royal', 'boutique', 'showcase'];

exports.updateShopSettings = async (req, res) => {
  const {
    shopName, description, phone, whatsapp, address, logo, lightLogo, darkLogo, banner, bannerType, bankDetails, theme, themeColor,
    category, subCategories, city, tehsil, district, state, pincode, gallery, workingHours, amenities,
    footerEmail, footerColumns, footerSocialLinks, legalPages,
    upiId, qrCodeImage, courierSettlementMode, shippingCharge, freeShippingThreshold,
    gstin, bisRegistration, specialities, yearEstablished,
  } = req.body;
  const seller = req.seller;

  // Plan-gated settings — reject instead of silently ignoring so the seller
  // sees why (the seller panel also shows these as locked).
  const caps = sellerCaps(seller);
  const planName = seller.planSnapshot?.name || 'current';
  if (bannerType === 'video' && seller.bannerType !== 'video' && !caps.videoBanner) {
    return res.status(403).json({ success: false, message: `Video banner is not included in your ${planName} plan. Upgrade to use a video banner.` });
  }
  if (theme !== undefined && theme !== 'classic' && theme !== seller.theme && !caps.premiumThemes) {
    return res.status(403).json({ success: false, message: `Premium themes are not included in your ${planName} plan. Upgrade to use the ${theme} theme.` });
  }

  if (shopName) seller.shopName = normalizeShopName(shopName);
  if (description !== undefined) seller.description = description;
  if (gstin !== undefined) seller.gstin = gstin;
  if (bisRegistration !== undefined) seller.bisRegistration = bisRegistration;
  if (Array.isArray(specialities)) seller.specialities = specialities.slice(0, 12);
  if (yearEstablished !== undefined) seller.yearEstablished = Number(yearEstablished) || undefined;
  if (phone !== undefined) seller.phone = phone;
  if (whatsapp !== undefined) seller.whatsapp = whatsapp;
  if (address !== undefined) seller.address = address;
  if (footerEmail !== undefined) seller.footerEmail = footerEmail;
  if (footerColumns !== undefined) seller.footerColumns = footerColumns;
  if (footerSocialLinks !== undefined) seller.footerSocialLinks = footerSocialLinks;
  if (legalPages !== undefined) seller.legalPages = { ...seller.legalPages, ...legalPages };
  if (logo !== undefined) seller.logo = logo;
  if (lightLogo !== undefined) seller.lightLogo = lightLogo;
  if (darkLogo !== undefined) seller.darkLogo = darkLogo;
  if (banner !== undefined) seller.banner = banner;
  if (bannerType !== undefined && ['image', 'video'].includes(bannerType)) seller.bannerType = bannerType;
  if (bankDetails) seller.bankDetails = { ...seller.bankDetails, ...bankDetails };
  if (upiId !== undefined) seller.upiId = upiId;
  if (qrCodeImage !== undefined) seller.qrCodeImage = qrCodeImage;
  if (courierSettlementMode !== undefined && ['online', 'manual'].includes(courierSettlementMode)) {
    seller.courierSettlementMode = courierSettlementMode;
    await CourierSellerPayment.updateMany({ seller: seller._id, status: 'pending' }, { $set: { settlementMode: courierSettlementMode } });
  }
  if (shippingCharge !== undefined) seller.shippingCharge = Number(shippingCharge) || 0;
  if (freeShippingThreshold !== undefined) seller.freeShippingThreshold = Number(freeShippingThreshold) || 0;
  if (theme !== undefined && THEME_OPTIONS.includes(theme)) seller.theme = theme;
  if (themeColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(themeColor)) seller.themeColor = themeColor;

  // Business directory fields
  if (category !== undefined) seller.category = category ? ((await ensureCategory(category, { addedBy: seller.shopName }))?.name || category) : category;
  if (subCategories !== undefined) seller.subCategories = subCategories;
  if (city !== undefined) seller.city = city;
  if (tehsil !== undefined) seller.tehsil = tehsil;
  if (pincode !== undefined) {
    const pin = String(pincode || '').trim();
    if (pin && !/^\d{6}$/.test(pin)) return res.status(400).json({ success: false, message: 'PIN code must be 6 digits' });
    seller.pincode = pin || undefined;
  }
  if (district !== undefined) seller.district = district;
  if (state !== undefined) seller.state = state;
  if (gallery !== undefined) seller.gallery = gallery;
  if (workingHours !== undefined) seller.workingHours = { ...seller.workingHours, ...workingHours };
  if (amenities !== undefined) seller.amenities = amenities;

  await seller.save();
  res.json({ success: true, seller, visibility: seller.getVisibilityStatus() });
};

// ── Products ──────────────────────────────────────────────────────────────────

exports.getSellerProducts = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = { sellerId: req.seller._id };
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { sku: { $regex: search, $options: 'i' } },
  ];

  const [products, total] = await Promise.all([
    Product.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, products, total, pages: Math.ceil(total / limit) });
};

exports.createSellerProduct = async (req, res) => {
  const siteSettings = await SiteSettings.findOne();
  if (siteSettings?.requireSellerKycForProducts !== false && req.seller.kyc?.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Approved KYC is required before adding products. Please submit your KYC for review.',
      kycStatus: req.seller.kyc?.status || 'not_submitted',
    });
  }
  const limit = req.seller.planSnapshot?.productLimit;
  // -1 (or no plan on file) means unlimited — only enforce when a real cap is set.
  if (typeof limit === 'number' && limit !== -1) {
    const currentCount = await Product.countDocuments({ sellerId: req.seller._id });
    if (currentCount >= limit) {
      return res.status(403).json({
        success: false,
        message: `Product limit reached. Your "${req.seller.planSnapshot?.name || 'current'}" plan allows up to ${limit} products. Upgrade your plan to add more.`,
      });
    }
  }
  await applyProductCategory(req.body, req.seller.shopName);
  await applyJewelleryPricing(req.body);
  const data = { ...req.body, sellerId: req.seller._id };
  const product = await Product.create(data);
  res.status(201).json({ success: true, product });
};

exports.updateSellerProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.seller._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });

  // Prevent changing sellerId
  delete req.body.sellerId;
  await applyProductCategory(req.body, req.seller.shopName);
  await applyJewelleryPricing(req.body);
  Object.assign(product, req.body);
  await product.save();
  res.json({ success: true, product });
};

exports.deleteSellerProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.seller._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });
  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
};

// ── KYC Verification (mandatory — identity docs + payout bank details) ──────
// A seller cannot request a withdrawal (see requestWithdrawal below) until
// kyc.status === 'approved' AND bankDetails are fully filled in. Bank
// details are collected right here, as part of KYC, since that's the one
// place Admin cross-checks identity before money is ever sent out.

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

exports.submitKyc = async (req, res) => {
  const { panNumber, panDocument, idDocument, addressProofType, addressProofDocument, selfie, bankDetails, upiId, qrCodeImage } = req.body;

  if (!panNumber || !panDocument || !idDocument) {
    return res.status(400).json({ success: false, message: 'PAN number, PAN document and ID document are all required' });
  }
  if (!addressProofType || !addressProofDocument) {
    return res.status(400).json({ success: false, message: 'Address proof (document type and photo) is required' });
  }
  if (!selfie) {
    return res.status(400).json({ success: false, message: 'A selfie is required for KYC' });
  }
  const { accountHolder, accountNumber, ifscCode, bankName } = bankDetails || {};
  if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
    return res.status(400).json({ success: false, message: 'Bank account holder name, account number, IFSC code and bank name are all required for KYC' });
  }
  if (!/^\d{9,18}$/.test(accountNumber)) {
    return res.status(400).json({ success: false, message: 'Enter a valid bank account number (9–18 digits)' });
  }
  const ifsc = ifscCode.toUpperCase().trim();
  if (!IFSC_REGEX.test(ifsc)) {
    return res.status(400).json({ success: false, message: 'Enter a valid IFSC code (e.g. SBIN0001234)' });
  }

  const seller = req.seller;
  seller.kyc = {
    ...seller.kyc?.toObject?.() ?? seller.kyc,
    panNumber: panNumber.toUpperCase().trim(),
    panDocument,
    idDocument,
    addressProofType: String(addressProofType).trim(),
    addressProofDocument,
    selfie,
    status: 'pending',
    rejectionReason: undefined,
    submittedAt: new Date(),
  };
  seller.bankDetails = { accountHolder, accountNumber, ifscCode: ifsc, bankName };
  if (upiId !== undefined) seller.upiId = String(upiId).trim();
  if (qrCodeImage !== undefined) seller.qrCodeImage = String(qrCodeImage).trim();
  await seller.save();

  await Notification.insertMany([
    {
      title: 'New KYC Submission',
      message: `${seller.shopName} has submitted KYC documents for verification.`,
      type: 'push',
      targetRole: 'admin',
    },

  ]);

  res.json({ success: true, seller });
};

// ── Earnings & Withdrawals ───────────────────────────────────────────────────
// Product-sale earnings remain in availableBalance for seller accounting.
// Only referralBalance can be withdrawn.
// Admin manually bank-transfers to seller.bankDetails and marks it
// completed (adminSellerController.updateWithdrawalStatus).

exports.getEarnings = async (req, res) => {
  const seller = req.seller;
  const sellerId = seller._id;
  const referralBalance = await getReferralWithdrawableBalance(sellerId);
  if (seller.referralBalance !== referralBalance) {
    seller.referralBalance = referralBalance;
    await seller.save();
  }

  const paidOrders = await Order.find({ 'items.seller': sellerId, isPaid: true });

  let totalSales = 0;
  let totalOrders = 0;
  const monthMap = new Map(); // 'YYYY-M' -> revenue
  const now = new Date();
  const curMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  paidOrders.forEach(order => {
    const mine = order.items.filter(i => i.seller?.toString() === sellerId.toString());
    if (!mine.length) return;
    totalOrders += 1;
    const orderTotal = mine.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    totalSales += orderTotal;
    const d = new Date(order.paidAt || order.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthMap.set(key, (monthMap.get(key) || 0) + orderTotal);
  });

  // No platform commission — sellers keep 100% of sales, they only pay the
  // annual subscription fee.
  const netEarnings = totalSales;
  const monthSales = monthMap.get(curMonthKey) || 0;
  const monthNet = monthSales;

  const revenueByMonth = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, revenue]) => {
      const [year, month] = key.split('-').map(Number);
      return { _id: { year, month }, revenue };
    });

  const withdrawals = await Withdrawal.find({ seller: sellerId }).sort('-requestedAt');

  res.json({
    success: true,
    earnings: {
      totalSales,
      totalOrders,
      netEarnings,
      monthSales,
      monthNet,
      availableBalance: seller.availableBalance,
      referralBalance: seller.referralBalance,
      totalWithdrawn: seller.totalWithdrawn,
    },
    revenueByMonth,
    withdrawals,
  });
};

exports.requestWithdrawal = async (req, res) => {
  const { amount, notes } = req.body;
  const seller = req.seller;

  if (seller.kyc?.status !== 'approved') {
    return res.status(403).json({ success: false, message: 'Complete and get your KYC verified before requesting a withdrawal.' });
  }
  const { accountHolder, accountNumber, ifscCode, bankName } = seller.bankDetails || {};
  if (!accountHolder || !accountNumber || !ifscCode || !bankName) {
    return res.status(400).json({ success: false, message: 'Your bank details are incomplete. Please update them under KYC.' });
  }
  if (!amount || amount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100' });
  }
  const referralBalance = await getReferralWithdrawableBalance(seller._id);
  if (seller.referralBalance !== referralBalance) {
    seller.referralBalance = referralBalance;
    await seller.save();
  }
  if (amount > referralBalance) {
    return res.status(400).json({ success: false, message: 'Only referral earnings can be withdrawn. Withdrawal amount exceeds your referral balance.' });
  }

  const withdrawal = await Withdrawal.create({
    seller: seller._id,
    amount,
    source: 'referral',
    notes,
    status: 'pending',
  });

  // Hold the amount immediately so it can't be double-requested; it's
  // released back only if Admin rejects the request.
  seller.referralBalance -= amount;
  seller.availableBalance -= amount;
  await seller.save();

  await Notification.create({
    title: 'New Withdrawal Request',
    message: `${seller.shopName} has requested a withdrawal of ₹${amount}.`,
    type: 'push',
    targetRole: 'admin',
  });

  res.status(201).json({ success: true, withdrawal });
};

exports.getMyWithdrawals = async (req, res) => {
  const withdrawals = await Withdrawal.find({ seller: req.seller._id }).sort('-requestedAt');
  res.json({ success: true, withdrawals });
};

// ── Referrals ─────────────────────────────────────────────────────────────

exports.getMyReferrals = async (req, res) => {
  const bonuses = await ReferralBonus.find({ referrer: req.seller._id })
    .sort('-createdAt')
    .populate('referredSeller', 'shopName shopSlug');
  const totalEarned = bonuses.reduce((sum, b) => sum + b.bonusAmount, 0);
  res.json({
    success: true,
    referralCode: req.seller.referralCode,
    totalReferred: bonuses.length,
    totalEarned,
    bonuses,
  });
};

// ── Public Shop ───────────────────────────────────────────────────────────────

exports.getPublicShop = async (req, res) => {
  // Public endpoint — never expose bank/KYC/earnings/payment-proof fields.
  const seller = await Seller.findOne({ shopSlug: req.params.slug, status: 'approved' })
    .select('-bankDetails -kyc -totalEarnings -availableBalance -referralBalance -totalWithdrawn -referralCode -referredBy -paymentReference -paymentScreenshot -razorpayOrderId -razorpayPaymentId -paymentVerified -offerPlanPaymentReference -offerPlanPaymentScreenshot -rejectionReason -courierSettlementMode')
    .populate('user', 'name');
  if (!seller) return res.status(404).json({ success: false, message: 'Shop not found' });
  if (seller.planExpiresAt && seller.planExpiresAt <= new Date()) {
    return res.status(404).json({ success: false, message: 'This shop is temporarily unavailable' });
  }
  if (!sellerCaps(seller).storefront) {
    return res.status(404).json({ success: false, message: 'This shop does not have an online store website on its current plan' });
  }

  const products = await Product.find(publicProductVisibilityQuery({
    sellerId: seller._id,
  })).populate(publicSellerPopulate('shopName shopSlug logo phone whatsapp status')).sort('-createdAt');
  res.json({ success: true, seller: publicSellerView(seller), products });
};

// ── Color Variant Management (same as admin) ──────────────────────────────────

// Keeps product.colors (used by listings, filters and cards) in step with the
// active colour variants, and makes sure one variant is the default.
const syncColors = (product) => {
  const active = product.variants.filter(v => v.isActive !== false);
  if (active.length) {
    product.colors = [...new Set(active.map(v => v.colorName))];
    if (!active.some(v => v.isDefault)) active[0].isDefault = true;
  }
};

exports.addSellerProductVariant = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.seller._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });

  const { colorName, colorCode, price, originalPrice, stock, sku, sizes, images, isActive, isDefault } = req.body;
  if (!colorName || !price) {
    return res.status(400).json({ success: false, message: 'colorName and price are required' });
  }

  // The first colour, or one marked default, becomes the default.
  const makeDefault = isDefault || product.variants.length === 0;
  if (makeDefault) {
    product.variants.forEach(v => { v.isDefault = false; });
  }

  const variant = {
    colorName,
    colorCode: colorCode || '#cccccc',
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : undefined,
    stock: Number(stock) || 0,
    sku: sku || undefined,
    sizes: sizes || [],
    images: images || [],
    isActive: isActive !== undefined ? isActive : true,
    isDefault: makeDefault,
  };

  product.variants.push(variant);
  syncColors(product);
  await product.save();
  res.status(201).json({ success: true, product });
};

exports.updateSellerProductVariant = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.seller._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

  const { colorName, colorCode, price, originalPrice, stock, sku, sizes, images, isActive, isDefault } = req.body;

  // If updating to default, unset existing default
  if (isDefault) {
    product.variants.forEach(v => { v.isDefault = false; });
  }

  if (colorName !== undefined) variant.colorName = colorName;
  if (colorCode !== undefined) variant.colorCode = colorCode;
  if (price !== undefined) variant.price = Number(price);
  if (originalPrice !== undefined) variant.originalPrice = Number(originalPrice);
  if (stock !== undefined) variant.stock = Number(stock);
  if (sku !== undefined) variant.sku = sku;
  if (sizes !== undefined) variant.sizes = sizes;
  if (images !== undefined) variant.images = images;
  if (isActive !== undefined) variant.isActive = isActive;
  if (isDefault !== undefined) variant.isDefault = isDefault;

  syncColors(product);
  await product.save();
  res.json({ success: true, product });
};

exports.deleteSellerProductVariant = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, sellerId: req.seller._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found or access denied' });

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

  product.variants.pull({ _id: req.params.variantId });
  syncColors(product);
  await product.save();
  res.json({ success: true, message: 'Variant deleted', product });
};

// ── Seller Dashboard Stats ────────────────────────────────────────────────────
// No platform-mediated orders in the connect-only model — this reflects listing
// health (catalog size, stock, reviews) rather than sales/revenue.

exports.getSellerDashboardStats = async (req, res) => {
  const [totalProducts, activeProducts, outOfStock, reviewAgg, paidOrders] = await Promise.all([
    Product.countDocuments({ sellerId: req.seller._id }),
    Product.countDocuments({ sellerId: req.seller._id, isActive: true }),
    Product.countDocuments({ sellerId: req.seller._id, stock: 0 }),
    Review.aggregate([
      { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'productDoc' } },
      { $unwind: '$productDoc' },
      { $match: { 'productDoc.sellerId': req.seller._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Order.find({ 'items.seller': req.seller._id, isPaid: true }, 'items paidAt createdAt'),
  ]);

  // Last 6 months of this seller's revenue — same shape as SellerEarnings'
  // chart, duplicated here (cheaply, off an indexed query) so the dashboard
  // can show a trend at a glance without an extra round-trip to /earnings.
  const monthMap = new Map();
  paidOrders.forEach(order => {
    const mine = order.items.filter(i => i.seller?.toString() === String(req.seller._id));
    if (!mine.length) return;
    const amount = mine.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const d = new Date(order.paidAt || order.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthMap.set(key, (monthMap.get(key) || 0) + amount);
  });
  const revenueByMonth = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, revenue]) => {
      const [year, month] = key.split('-').map(Number);
      return { _id: { year, month }, revenue };
    });

  res.json({
    success: true,
    stats: {
      totalProducts,
      activeProducts,
      outOfStock,
      avgRating: reviewAgg[0]?.avgRating ? Number(reviewAgg[0].avgRating.toFixed(1)) : 0,
      totalReviews: reviewAgg[0]?.count || 0,
      plan: req.seller.planSnapshot?.name || null,
      planExpiresAt: req.seller.planExpiresAt,
      kycStatus: req.seller.kyc?.status || 'not_submitted',
    },
    revenueByMonth,
  });
};

// Orders containing this seller's products only.
exports.getSellerOrders = async (req, res) => {
  const { status } = req.query;
  const query = { 'items.seller': req.seller._id };
  if (status) query.status = status;
  const [orders, total] = await Promise.all([
    Order.find(query).sort('-createdAt').populate('user', 'name email phone'),
    Order.countDocuments(query),
  ]);
  orders.forEach(order => {
    order.items = order.items.filter(item => item.seller?.toString() === req.seller._id.toString());
  });
  res.json({ success: true, orders, total });
};

exports.updateSellerOrderStatus = async (req, res) => {
  const allowed = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
  const { status, trackingNumber } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid seller order status' });
  const order = await Order.findOne({ _id: req.params.id, 'items.seller': req.seller._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found for this seller' });

  const myItems = order.items.filter(item => item.seller?.toString() === req.seller._id.toString());
  const myRefundAmount = myItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

  order.status = status;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }
  if (status === 'cancelled' && myRefundAmount > 0) {
    await creditWallet(order.user, myRefundAmount, `Refund for cancelled product(s) from seller #${req.seller._id}`, { orderId: order._id });
    const hasOtherSellerItems = order.items.some(item => item.seller && item.seller.toString() !== req.seller._id.toString());
    if (!hasOtherSellerItems) order.status = 'cancelled';
  }
  await order.save();
  res.json({ success: true, order });
};

exports.getSellerCourierPayments = async (req, res) => {
  const payments = await CourierSellerPayment.find({ seller: req.seller._id })
    .populate({ path: 'order', select: 'orderNumber createdAt' })
    .populate({ path: 'courier', populate: { path: 'user', select: 'name phone' } })
    .sort('-createdAt');
  res.json({ success: true, payments });
};

exports.reviewCourierPayment = async (req, res) => {
  const { status, sellerNote } = req.body;
  if (!['approved', 'disputed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be approved or disputed' });
  }
  const payment = await CourierSellerPayment.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment proof not found' });
  if (payment.status === 'approved') return res.status(400).json({ success: false, message: 'Payment is already approved' });
  // Online: only a submitted screenshot can be reviewed. Manual: the courier
  // pays the seller directly, so the seller can confirm receipt any time.
  if (payment.settlementMode !== 'manual' && payment.status !== 'submitted') {
    return res.status(400).json({ success: false, message: 'Wait for the courier to upload the payment screenshot' });
  }
  if (status === 'disputed' && payment.status !== 'submitted') {
    return res.status(400).json({ success: false, message: 'Only a payment the courier has marked as paid can be disputed' });
  }
  payment.sellerNote = sellerNote || '';
  payment.status = status;
  if (status === 'approved') {
    req.seller.availableBalance += payment.amount;
    req.seller.totalEarnings += payment.amount;
    payment.approvedAt = new Date();
    await req.seller.save();
  } else {
    payment.rejectedAt = new Date();
  }
  await payment.save();
  const CourierPartner = require('../models/CourierPartner');
  const courier = await CourierPartner.findById(payment.courier).select('user');
  await Notification.create({
    title: status === 'approved' ? 'COD settlement approved' : 'COD settlement disputed',
    message: status === 'approved'
      ? `Seller approved your ₹${payment.amount} COD payment. Settlement completed.`
      : payment.settlementMode === 'manual'
        ? `Seller has not confirmed your ₹${payment.amount} manual COD payment. Please contact the seller and confirm payment.`
        : `Seller did not approve your ₹${payment.amount} COD payment. Please verify the transfer and submit a new screenshot.`,
    type: 'push',
    targetUser: courier?.user,
    relatedOrder: payment.order,
  });
  res.json({ success: true, payment });
};