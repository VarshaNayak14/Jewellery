const mongoose = require('mongoose');
const { shopSlugBase } = require('../utils/slug');
const { capabilitiesSchemaDef } = require('../utils/planCapabilities');

const bankDetailsSchema = new mongoose.Schema({
  accountHolder: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
}, { _id: false });

const sellerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  shopName: { type: String, required: true, trim: true },
  shopSlug: { type: String, unique: true, lowercase: true, trim: true },
  logo: { type: String, default: '' },
  lightLogo: { type: String, default: '' },
  darkLogo: { type: String, default: '' },
  banner: { type: String, default: '' },
  // Lets a seller use a short looping video instead of a static image for
  // their storefront hero banner — same `banner` URL field either way, this
  // just tells the storefront theme which tag to render it with.
  bannerType: { type: String, enum: ['image', 'video'], default: 'image' },
  description: { type: String, default: '' },
  // Jeweller credentials shown on the store page / used by Admin during approval.
  gstin: { type: String, trim: true, uppercase: true, default: '' },
  bisRegistration: { type: String, trim: true, uppercase: true, default: '' },
  specialities: [{ type: String, trim: true }], // e.g. Gold, Diamond, Bridal, Silver
  yearEstablished: { type: Number },
  // Storefront customization — seller picks a theme layout + accent color for their public store
  theme: { type: String, enum: ['classic', 'minimal', 'vibrant', 'royal', 'boutique', 'showcase'], default: 'classic' },
  themeColor: { type: String, default: '#4f46e5' },
  phone: { type: String },
  whatsapp: { type: String },
  address: { type: String },
  footerEmail: { type: String, trim: true, default: '' },
  footerColumns: {
    type: [{
      heading: { type: String, trim: true, default: '' },
      subheading: { type: String, trim: true, default: '' },
      links: [{ label: { type: String, trim: true }, url: { type: String, trim: true } }],
    }],
    default: [],
  },
  footerSocialLinks: {
    type: [{ platform: { type: String, trim: true }, url: { type: String, trim: true } }],
    default: [],
  },
  legalPages: {
    privacyPolicy: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
  },
  // Direct-to-seller payment (0%-commission "connect only" model — the
  // platform never touches the money). Customer pays the seller straight via
  // UPI; delivery/returns/refunds are handled between them, not by us.
  upiId: { type: String, trim: true },
  qrCodeImage: { type: String, default: '' },
  courierSettlementMode: {
    type: String,
    enum: ['online', 'manual'],
    default: 'online',
  },
  // Delivery is arranged directly between seller and customer in this
  // connect-only model — each seller sets/shows their own shipping charge
  // and free-shipping threshold instead of one platform-wide rule.
  shippingCharge: { type: Number, default: 0, min: 0 },
  freeShippingThreshold: { type: Number, default: 0, min: 0 },
  // ── Business Directory fields (JustDial-style listing) ──────────────────
  // Primary category this business is listed under (e.g. "Restaurants",
  // "Electricians", "Salons") — matches Category.name so search/filter works.
  category: { type: String, trim: true, index: true },
  subCategories: [{ type: String, trim: true }],
  city: { type: String, trim: true, index: true },
  // Revenue-department style location hierarchy used to control shop
  // visibility by plan (see planSnapshot.visibilityScope below):
  //   tehsil < district < state < india
  tehsil: { type: String, trim: true, index: true },
  // 6-digit PIN code — for "Top in Pincode" local search (plan ranking decides order)
  pincode: { type: String, trim: true, index: true, match: [/^\d{6}$/, 'PIN code must be 6 digits'] },
  district: { type: String, trim: true, index: true },
  state: { type: String, trim: true, index: true },
  // Photo gallery shown on the business detail page (separate from logo/banner)
  gallery: [{ type: String }],
  // Highlight tags shown as chips on the business detail page — seller's own
  // words for what makes the shop stand out (e.g. "Pure Veg", "Home
  // Delivery", "Parking Available", "Rooftop Seating").
  amenities: [{ type: String, trim: true }],
  workingHours: {
    // e.g. { mon: '9:00 AM - 9:00 PM', tue: '...', ..., sun: 'Closed' }
    mon: { type: String, default: '' },
    tue: { type: String, default: '' },
    wed: { type: String, default: '' },
    thu: { type: String, default: '' },
    fri: { type: String, default: '' },
    sat: { type: String, default: '' },
    sun: { type: String, default: '' },
  },
  // Aggregated rating shown on listing cards (kept in sync from Review docs)
  avgRating: { type: Number, default: 0 },
  numRatings: { type: Number, default: 0 },
  // Bayesian rating used to order shops on the same plan level — see
  // utils/sellerRanking.js (3.5 = no reviews yet).
  rankScore: { type: Number, default: 3.5, index: true },
  totalEnquiries: { type: Number, default: 0 },
  // Verified businesses get a badge on their listing (admin-controlled)
  isVerified: { type: Boolean, default: false },
  // Subscription plan selected at registration (Super Admin manages the catalog)
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  // Personal business manager (plan rule: businessManager) — an Admin / Super
  // Admin staff account the seller can contact directly; their support
  // tickets are routed to this person.
  accountManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Snapshot of plan details at the time of purchase, so history stays intact
  // even if the plan is later edited or removed from the catalog.
  planSnapshot: {
    name: { type: String },
    price: { type: Number },
    productLimit: { type: Number },
    visibilityScope: { type: String, enum: ['tehsil', 'district', 'state', 'india'] },
    // Working plan features — kept in sync when Super Admin edits the plan.
    capabilities: { type: new mongoose.Schema(capabilitiesSchemaDef, { _id: false }), default: () => ({}) },
  },
  planExpiresAt: { type: Date },
  planPurchasedAt: { type: Date },
  // Separate subscription used only for creating Homepage Offers.
  offerPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  offerPlanSnapshot: {
    name: { type: String },
    price: { type: Number },
    bannerLimit: { type: Number }, // -1 / missing = unlimited
  },
  offerPlanStartedAt: { type: Date },
  offerPlanExpiresAt: { type: Date },
  offerPlanPaymentReference: { type: String, default: '' },
  offerPlanPaymentScreenshot: { type: String, default: '' },
  // UTR / transaction reference the seller entered at registration after
  // paying the plan fee to the Super Admin's bank/UPI (shown on the
  // "Become a Seller" payment step). Lets Admin cross-check the transfer
  // before approving the account. Optional — plan is granted immediately.
  paymentReference: { type: String, trim: true, default: '' },
  // Screenshot of the payment (UPI/bank transfer) the seller uploaded at
  // registration, stored as a base64 data URL. Lets Admin visually verify the
  // transfer before approving the account. Optional — plan is granted immediately.
  paymentScreenshot: { type: String, default: '' },
  // Razorpay online payment (preferred path — verified server-side, see
  // sellerController.registerSeller). Falls back to paymentReference /
  // paymentScreenshot only when Razorpay isn't configured.
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  paymentVerified: { type: Boolean, default: false },
  // Status controlled by admin only
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'blocked'],
    default: 'pending',
  },
  // Financials
  totalEarnings: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  // Referral bonuses are withdrawable separately from product-sale earnings.
  referralBalance: { type: Number, default: 0, min: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  // Bank details for withdrawals
  bankDetails: { type: bankDetailsSchema, default: {} },
  // Rejection reason
  rejectionReason: { type: String },
  // ── Referral program ────────────────────────────────────────────────────
  // Every seller gets a shareable code. When a new seller signs up with it,
  // `referredBy` links back to the referrer and a one-time signup bonus
  // (SiteSettings.referralCommissionPercent % of the new seller's plan
  // price) is credited to the referrer at registration — see
  // sellerController.registerSeller.
  referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  // KYC verification — required before a seller's first withdrawal is allowed
  kyc: {
    panNumber: { type: String, trim: true, uppercase: true },
    panDocument: { type: String, default: '' },
    idDocument: { type: String, default: '' },
    // Address verification: which document it is + its photo
    addressProofType: { type: String, trim: true, default: '' },
    addressProofDocument: { type: String, default: '' },
    // Live photo of the seller, matched against the ID photo by the Admin
    selfie: { type: String, default: '' },
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
    },
    rejectionReason: { type: String },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
  },
}, { timestamps: true });

// ── Location-based visibility status ────────────────────────────────────────
// Tells the seller (via shop settings) how far their shop currently reaches,
// and whether it's temporarily hidden because their plan lapsed. The actual
// matching against a customer's search location happens in businessController
// (as a DB query) — this is just the human-readable summary for the seller's
// own dashboard. Sellers with no planSnapshot on file (legacy/seeded data
// from before plans existed) are treated as unrestricted ('india' scope)
// rather than penalized.
sellerSchema.methods.getVisibilityStatus = function () {
  const scope = this.planSnapshot?.visibilityScope || 'india';
  const expired = !!this.planExpiresAt && this.planExpiresAt.getTime() < Date.now();
  const region = scope === 'india' ? 'India'
    : scope === 'state' ? (this.state || '')
    : scope === 'district' ? (this.district || '')
    : (this.tehsil || '');
  return { scope, expired, region, visible: !expired };
};

// Auto-generate shopSlug from shopName and normalize legacy names so old
// entries like "Mohan - Fashion - Hub" generate a clean subdomain slug.
sellerSchema.pre('save', function (next) {
  if (this.isModified('shopName')) {
    this.shopName = this.shopName?.trim() || this.shopName;
    if (!this.shopSlug || this.shopSlug !== shopSlugBase(this.shopName)) {
      this.shopSlug = shopSlugBase(this.shopName);
    }
  }
  next();
});

// Every seller gets a referral code the first time they're saved — generated
// here (not at registration) so it also backfills sellers created before
// this feature existed, the next time any of them is saved.
sellerSchema.pre('save', async function (next) {
  if (this.referralCode) return next();
  const base = (this.shopSlug || this.shopName || 'SELLER')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8) || 'SELLER';
  const Seller = this.constructor;
  let code;
  do {
    code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  } while (await Seller.findOne({ referralCode: code }));
  this.referralCode = code;
  next();
});

module.exports = mongoose.model('Seller', sellerSchema);