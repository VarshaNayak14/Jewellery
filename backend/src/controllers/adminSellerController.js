const Seller = require("../models/Seller");
const User = require("../models/User");
const Product = require("../models/Product");
const SubscriptionPayment = require("../models/SubscriptionPayment");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Withdrawal = require("../models/Withdrawal");
const Notification = require("../models/Notification");
const SiteSettings = require("../models/SiteSettings");
const { sendMail, isConfigured: mailConfigured } = require("../services/mailer");
const { creditReferralBonus } = require("../services/referralService");
const { addDuration } = require('../utils/subscription');
const { snapshotFromPlan } = require('../utils/planCapabilities');
const { normalizeShopName, shopSlugBase } = require('../utils/slug');
const { ensureCategory } = require('../utils/categoryResolver');

// POST /api/v1/admin/sellers — Admin / Super Admin adds a seller directly.
// Unlike self sign-up (which waits for approval and payment), the account
// is created approved, can log in right away, and the chosen plan starts
// today. Any fee collected offline is recorded in Subscription Payments.
exports.createSeller = async (req, res) => {
  const {
    name, email, password, phone, shopName, shopDescription, address, category,
    city, tehsil, district, state, pincode, planId, amountPaid, paymentNote, sendEmail,
  } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!name?.trim() || !cleanEmail || !password || !shopName?.trim() || !phone?.trim()) {
    return res.status(400).json({ success: false, message: 'Name, email, password, phone and shop name are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ success: false, message: 'Enter a valid email' });
  if (String(password).length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  if (!category || !city) return res.status(400).json({ success: false, message: 'Business category and city are required' });

  const plan = await SubscriptionPlan.findOne({ _id: planId, purpose: { $ne: 'offer' } });
  if (!plan) return res.status(400).json({ success: false, message: 'Choose a seller plan' });
  // Same location rule as sign-up: the plan's reach needs these to show the shop.
  if (plan.visibilityScope === 'tehsil' && (!tehsil || !district || !state)) {
    return res.status(400).json({ success: false, message: `${plan.name} is a tehsil plan — tehsil, district and state are required` });
  }
  if (plan.visibilityScope === 'district' && (!district || !state)) {
    return res.status(400).json({ success: false, message: `${plan.name} is a district plan — district and state are required` });
  }
  if (plan.visibilityScope === 'state' && !state) {
    return res.status(400).json({ success: false, message: `${plan.name} is a state plan — state is required` });
  }
  if (await User.findOne({ email: cleanEmail })) {
    return res.status(400).json({ success: false, message: 'This email is already registered' });
  }

  const businessCategory = await ensureCategory(category, { addedBy: req.user.name });
  const cleanShopName = normalizeShopName(shopName);
  const baseSlug = shopSlugBase(cleanShopName);
  let slug = baseSlug;
  for (let n = 1; await Seller.findOne({ shopSlug: slug }); n++) slug = `${baseSlug}${n}`;

  const user = await User.create({
    name: name.trim(), email: cleanEmail, password, phone: phone.trim(),
    role: 'seller', isActive: true,
  });
  const planPurchasedAt = new Date();
  const planExpiresAt = addDuration(planPurchasedAt, plan);
  let seller;
  try {
    seller = await Seller.create({
      user: user._id,
      shopName: cleanShopName,
      shopSlug: slug,
      description: shopDescription || '',
      phone: phone.trim(),
      address: address || '',
      category: businessCategory?.name || category,
      city, tehsil, district, state,
      pincode: /^\d{6}$/.test(String(pincode || '')) ? String(pincode) : undefined,
      status: 'approved',
      paymentVerified: true,
      plan: plan._id,
      planSnapshot: snapshotFromPlan(plan),
      planPurchasedAt,
      planExpiresAt,
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id); // don't leave a login with no shop
    throw err;
  }

  const paid = Math.max(Number(amountPaid) || 0, 0);
  await SubscriptionPayment.create({
    seller: seller._id, plan: plan._id, planName: plan.name, amount: paid,
    status: 'paid', paymentMethod: 'admin_assignment',
    transactionId: String(paymentNote || '').trim() || `added-by-${req.user._id}`,
    purchasedAt: planPurchasedAt, expiresAt: planExpiresAt,
  });

  let emailSent = false;
  if (sendEmail !== false) {
    try { await sendSellerApprovalEmail(seller, user); emailSent = mailConfigured(); }
    catch (error) { console.error('Seller welcome email failed:', error.message); }
  }

  res.status(201).json({
    success: true,
    message: `${seller.shopName} added and approved on the ${plan.name} plan`,
    seller,
    emailSent,
  });
};

const sendSellerApprovalEmail = async (seller, user) => {
  if (!mailConfigured() || !user?.email) return;
  await sendMail({
    to: user.email,
    subject: `${seller.shopName} is approved on growthkarts`,
    heading: 'Your seller account is approved',
    paragraphs: [
      `Hello ${user.name || seller.shopName},`,
      `Your seller application for ${seller.shopName} has been approved.`,
      'You can now sign in to your Seller Portal and start managing your shop.',
    ],
    button: { label: 'Open Seller Portal', path: '/seller/login' },
    footer: 'You received this email because you applied to sell on growthkarts.',
  });
};

// ── Seller List & Management ──────────────────────────────────────────────────

exports.getAllSellers = async (req, res) => {
  const { page = 1, limit = 20, status, search, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.shopName = { $regex: search, $options: "i" };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const sellers = await Seller.find(filter)
    .populate("user", "name email phone createdAt")
    .populate("accountManager", "name email phone")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Enrich with catalog stats — no order/revenue data in the connect-only model.
  const enriched = await Promise.all(
    sellers.map(async (seller) => {
      const productCount = await Product.countDocuments({
        sellerId: seller._id,
      });
      return { ...seller.toObject(), stats: { productCount } };
    }),
  );

  const total = await Seller.countDocuments(filter);
  res.json({
    success: true,
    sellers: enriched,
    total,
    pages: Math.ceil(total / limit),
  });
};

exports.getSellerById = async (req, res) => {
  const seller = await Seller.findById(req.params.id).populate(
    "user",
    "name email phone createdAt isActive",
  );
  if (!seller)
    return res
      .status(404)
      .json({ success: false, message: "Seller not found" });

  const products = await Product.find({ sellerId: seller._id }).limit(10);
  const productCount = await Product.countDocuments({ sellerId: seller._id });

  res.json({ success: true, seller, products, stats: { productCount } });
};

exports.updateSellerStatus = async (req, res) => {
  const { status, rejectionReason } = req.body;
  const allowed = ["pending", "approved", "rejected", "blocked"];
  if (!allowed.includes(status)) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Status must be one of: ${allowed.join(", ")}`,
      });
  }

  const seller = await Seller.findById(req.params.id);
  if (!seller)
    return res
      .status(404)
      .json({ success: false, message: "Seller not found" });

  const wasPending = seller.status === "pending";
  seller.status = status;
  if (status === "rejected" && rejectionReason)
    seller.rejectionReason = rejectionReason;

  // Also update user isActive based on seller status
  const isActive = status === "approved";
  await User.findByIdAndUpdate(seller.user, { isActive });

  // A manual bank/QR transfer is confirmed by Admin approving the seller: mark
  // the pending subscription payment paid and release the referral bonus.
  // Rejecting it marks the payment failed.
  if (status === "approved" && !seller.paymentVerified) {
    seller.paymentVerified = true;
    await SubscriptionPayment.updateMany(
      { seller: seller._id, status: { $in: ["pending", "failed"] } },
      { status: "paid" },
    );
  } else if (status === "rejected") {
    await SubscriptionPayment.updateMany(
      { seller: seller._id, status: "pending" },
      { status: "failed" },
    );
  }

  await seller.save();
  if (status === "approved") await creditReferralBonus(seller);
  if (wasPending && status === "approved") {
    const user = await User.findById(seller.user).select("name email");
    try {
      await sendSellerApprovalEmail(seller, user);
    } catch (error) {
      console.error("Seller approval email failed:", error.message);
    }
  }
  res.json({ success: true, seller });
};

// ── KYC Verification ────────────────────────────────────────────────────────────
// Mandatory before a seller can request a withdrawal — approving KYC here is
// what unlocks the "Request Withdrawal" button on the seller's Earnings page
// (see sellerController.requestWithdrawal). Also doubles as a trust badge.

// GET /api/v1/admin/kyc — every seller's KYC submission, filterable by status,
// plus counts for each status so the KYC Management page can show a summary.
exports.getKycRequests = async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter["kyc.status"] = status;

  const sellers = await Seller.find(filter)
    .select("shopName shopSlug logo phone kyc createdAt")
    .populate("user", "name email")
    .sort("-kyc.submittedAt");

  const allSellers = await Seller.find({}, "kyc.status");
  const counts = { not_submitted: 0, pending: 0, approved: 0, rejected: 0 };
  allSellers.forEach((s) => {
    const st = s.kyc?.status || "not_submitted";
    counts[st] = (counts[st] || 0) + 1;
  });

  res.json({ success: true, sellers, counts });
};

exports.getProductKycRequirement = async (req, res) => {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  res.json({ success: true, required: settings.requireSellerKycForProducts });
};

exports.updateProductKycRequirement = async (req, res) => {
  if (typeof req.body?.required !== "boolean") {
    return res.status(400).json({ success: false, message: "required must be a boolean" });
  }

  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  settings.requireSellerKycForProducts = req.body.required;
  await settings.save();
  res.json({ success: true, required: settings.requireSellerKycForProducts });
};

exports.updateSellerKyc = async (req, res) => {
  const { status, rejectionReason } = req.body;
  const allowed = ["approved", "rejected"];
  if (!allowed.includes(status)) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Status must be one of: ${allowed.join(", ")}`,
      });
  }

  const seller = await Seller.findById(req.params.id);
  if (!seller)
    return res
      .status(404)
      .json({ success: false, message: "Seller not found" });
  if (!seller.kyc || seller.kyc.status === "not_submitted") {
    return res
      .status(400)
      .json({
        success: false,
        message: "Seller has not submitted KYC documents yet",
      });
  }

  seller.kyc.status = status;
  seller.kyc.reviewedAt = new Date();
  if (status === "rejected") seller.kyc.rejectionReason = rejectionReason || "";

  await seller.save();

  await Notification.create({
    title: status === "approved" ? "KYC Approved" : "KYC Rejected",
    message:
      status === "approved"
        ? "Your KYC has been verified — you can now request withdrawals."
        : `Your KYC was rejected${rejectionReason ? `: ${rejectionReason}` : "."} Please resubmit your documents.`,
    type: "push",
    targetUser: seller.user,
  });

  res.json({ success: true, seller });
};

// ── Seller Analytics ──────────────────────────────────────────────────────────
// Platform revenue now comes entirely from Subscription Payments, not order
// commission — see getSubscriptionPayments for the revenue-side numbers.

exports.getSellerAnalytics = async (req, res) => {
  const [
    totalSellers,
    activeSellers,
    pendingSellers,
    rejectedSellers,
    blockedSellers,
  ] = await Promise.all([
    Seller.countDocuments(),
    Seller.countDocuments({ status: "approved" }),
    Seller.countDocuments({ status: "pending" }),
    Seller.countDocuments({ status: "rejected" }),
    Seller.countDocuments({ status: "blocked" }),
  ]);

  res.json({
    success: true,
    analytics: {
      totalSellers,
      activeSellers,
      pendingSellers,
      rejectedSellers,
      blockedSellers,
    },
  });
};

// ── Subscription Payments ────────────────────────────────────────────────────────

// GET /api/v1/admin/subscription-payments — every plan purchase/renewal a
// seller has made, plus revenue/active/expiring summary stats.
exports.getSubscriptionPayments = async (req, res) => {
  const { status, search, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.purchasedAt = {};
    if (from) filter.purchasedAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.purchasedAt.$lte = toDate;
    }
  }
  if (search) {
    // SubscriptionPayment only stores a seller ref, so resolve matching
    // sellers by shop name first, then narrow the payments query by id.
    const matchingSellers = await Seller.find({
      shopName: { $regex: search, $options: "i" },
    }).select("_id");
    filter.seller = { $in: matchingSellers.map((s) => s._id) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [
    payments,
    total,
    revenueAgg,
    activeCount,
    expiringSoonCount,
    expiredCount,
  ] = await Promise.all([
    SubscriptionPayment.find(filter)
      .populate({
        path: "seller",
        select: "shopName shopSlug logo status planExpiresAt",
        populate: { path: "user", select: "name email" },
      })
      .sort("-purchasedAt")
      .skip(skip)
      .limit(parseInt(limit)),
    SubscriptionPayment.countDocuments(filter),
    SubscriptionPayment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Seller.countDocuments({ planExpiresAt: { $gt: new Date() } }),
    Seller.countDocuments({
      planExpiresAt: {
        $gt: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    Seller.countDocuments({ planExpiresAt: { $lte: new Date() } }),
  ]);

  res.json({
    success: true,
    payments,
    total,
    pages: Math.ceil(total / limit),
    stats: {
      totalRevenue: revenueAgg[0]?.total || 0,
      activeSubscriptions: activeCount,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
    },
  });
};

exports.verifyOfferPlanPayment = async (req, res) => {
  const payment = await SubscriptionPayment.findOne({
    _id: req.params.id,
    purpose: "offer",
    status: "pending",
  });
  if (!payment)
    return res
      .status(404)
      .json({ success: false, message: "Pending offer payment not found" });
  const seller = await Seller.findById(payment.seller);
  const plan = await SubscriptionPlan.findById(payment.plan);
  if (!seller || !plan)
    return res
      .status(404)
      .json({ success: false, message: "Seller or offer plan not found" });

  const offerPlanExpiresAt = addDuration(new Date(), plan);
  seller.offerPlan = plan._id;
  seller.offerPlanSnapshot = { name: plan.name, price: plan.price, bannerLimit: plan.bannerLimit ?? -1 };
  seller.offerPlanStartedAt = new Date();
  seller.offerPlanExpiresAt = offerPlanExpiresAt;
  seller.offerPlanPaymentReference = "";
  seller.offerPlanPaymentScreenshot = "";
  payment.status = "paid";
  payment.expiresAt = offerPlanExpiresAt;
  await Promise.all([seller.save(), payment.save()]);
  res.json({
    success: true,
    message: "Offer plan payment verified and activated",
  });
};

// Seller plan renewal / switch paid by bank or QR from the seller's "My Plan"
// page — verifying it activates the plan (starts today) for that seller.
exports.verifySellerPlanPayment = async (req, res) => {
  const payment = await SubscriptionPayment.findOne({
    _id: req.params.id,
    purpose: "seller",
    status: "pending",
    paymentMethod: "bank_qr",
  });
  if (!payment)
    return res
      .status(404)
      .json({ success: false, message: "Pending plan payment not found" });
  const [seller, plan] = await Promise.all([
    Seller.findById(payment.seller),
    SubscriptionPlan.findById(payment.plan),
  ]);
  if (!seller || !plan)
    return res
      .status(404)
      .json({ success: false, message: "Seller or plan not found" });
  // Sign-up payments of not-yet-approved sellers are confirmed by approving
  // the seller (Seller Management), not here.
  if (seller.status !== "approved")
    return res.status(400).json({
      success: false,
      message: "This seller is not approved yet — approve the seller from Seller Management instead.",
    });

  const purchasedAt = new Date();
  const expiresAt = addDuration(purchasedAt, plan);
  seller.plan = plan._id;
  seller.planSnapshot = snapshotFromPlan(plan);
  seller.planPurchasedAt = purchasedAt;
  seller.planExpiresAt = expiresAt;
  payment.status = "paid";
  payment.purchasedAt = purchasedAt;
  payment.expiresAt = expiresAt;
  await Promise.all([seller.save(), payment.save()]);
  res.json({ success: true, message: `${plan.name} plan activated for ${seller.shopName}` });
};

// Reject a pending bank/QR plan or offer-plan payment (wrong UTR, amount not
// received, ...). Sign-up payments are handled by approving/rejecting the seller.
exports.rejectPlanPayment = async (req, res) => {
  const payment = await SubscriptionPayment.findOne({
    _id: req.params.id,
    status: "pending",
    paymentMethod: "bank_qr",
  }).populate("seller", "status");
  if (!payment)
    return res
      .status(404)
      .json({ success: false, message: "Pending payment not found" });
  if (payment.purpose === "seller" && payment.seller?.status !== "approved")
    return res.status(400).json({
      success: false,
      message: "This is a sign-up payment — reject the seller from Seller Management instead.",
    });
  payment.status = "failed";
  await payment.save();
  res.json({ success: true, message: "Payment rejected" });
};

// ── Withdrawals (Admin) ───────────────────────────────────────────────────────
// Sellers request payouts from their Earnings page (sellerController.js).
// Admin reviews each request here, then manually bank-transfers the amount
// to seller.bankDetails (captured during KYC) using the seller's own
// banking app / netbanking, and finally marks the request 'completed' with
// the transaction reference — there is no automated payout gateway wired up.

exports.getAllWithdrawals = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [withdrawals, total] = await Promise.all([
    Withdrawal.find(filter)
      .populate({
        path: "seller",
        select: "shopName shopSlug logo bankDetails kyc",
        populate: { path: "user", select: "name email phone" },
      })
      .sort("-requestedAt")
      .skip(skip)
      .limit(parseInt(limit)),
    Withdrawal.countDocuments(filter),
  ]);

  res.json({
    success: true,
    withdrawals,
    total,
    pages: Math.ceil(total / limit),
  });
};

exports.updateWithdrawalStatus = async (req, res) => {
  const { status, transactionId, adminNotes } = req.body;
  const allowed = ["approved", "rejected", "completed"];
  if (!allowed.includes(status)) {
    return res
      .status(400)
      .json({
        success: false,
        message: `Status must be one of: ${allowed.join(", ")}`,
      });
  }

  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal)
    return res
      .status(404)
      .json({ success: false, message: "Withdrawal request not found" });
  if (withdrawal.status === "completed" || withdrawal.status === "rejected") {
    return res
      .status(400)
      .json({
        success: false,
        message: `This request is already ${withdrawal.status}`,
      });
  }

  const seller = await Seller.findById(withdrawal.seller);
  if (!seller)
    return res
      .status(404)
      .json({ success: false, message: "Seller not found" });

  if (status === "rejected") {
    // Release the held referral amount back to the matching ledger.
    seller.referralBalance += withdrawal.amount;
    seller.availableBalance += withdrawal.amount;
    await seller.save();
  }
  if (status === "completed") {
    if (!transactionId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Transaction ID / UTR reference is required to mark a withdrawal completed",
        });
    }
    seller.totalWithdrawn += withdrawal.amount;
    await seller.save();
    withdrawal.completedAt = new Date();
    withdrawal.transactionId = transactionId;
  }
  if (status === "approved") {
    withdrawal.approvedAt = new Date();
  }

  withdrawal.status = status;
  if (adminNotes !== undefined) withdrawal.adminNotes = adminNotes;
  await withdrawal.save();

  const statusMessage = {
    approved: `Your withdrawal request of ₹${withdrawal.amount} has been approved and will be processed shortly.`,
    rejected: `Your withdrawal request of ₹${withdrawal.amount} was rejected${adminNotes ? `: ${adminNotes}` : "."} The amount has been returned to your available balance.`,
    completed: `₹${withdrawal.amount} has been transferred to your bank account (Ref: ${withdrawal.transactionId}).`,
  };
  await Notification.create({
    title: `Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: statusMessage[status],
    type: "push",
    targetUser: seller.user,
  });

  res.json({ success: true, withdrawal });
};
