const Seller = require('../models/Seller');
const { publicSellerView, RANKING_SORT_FIELD } = require('../utils/planCapabilities');
const { visibleSellerClause, notExpiredClause } = require('../utils/sellerVisibility');
const { findRankedSellers } = require('../utils/sellerRanking');

const ciExact = (value) => ({ $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' });


// @desc   Search/browse businesses — the core JustDial-style directory search.
//         Supports category, city and free-text (name/description) filters.
//         When any of `state` / `district` / `tehsil` is passed, switches to
//         location-scoped mode: only businesses whose subscription plan
//         reaches that location are returned. Each plan has a visibilityScope
//         (tehsil/district/state/india) — a seller only shows up in a
//         location search if their scope covers the searched location:
//           india scope    -> matches any location search
//           state scope    -> matches when the searched state equals theirs
//           district scope -> matches when the searched district equals theirs
//           tehsil scope   -> matches when the searched tehsil equals theirs
//         A wider-scope seller (e.g. state) therefore also shows up when a
//         customer searches a specific district/tehsil inside that state,
//         while a narrower-scope seller (e.g. tehsil) only shows up for
//         their own exact tehsil.
// @route  GET /api/v1/businesses?category=&city=&search=&sort=&page=&limit=&state=&district=&tehsil=
// @access Public
const LIST_FIELDS = 'shopName shopSlug logo lightLogo darkLogo banner bannerType description category subCategories city district state tehsil phone whatsapp avgRating numRatings isVerified specialities yearEstablished bisRegistration address planSnapshot.capabilities';

exports.searchBusinesses = async (req, res) => {
  const { category, city, search, sort = 'relevance', page = 1, limit = 20, state, district, tehsil } = req.query;

  const filter = { status: 'approved' };
  if (category) filter.category = category;
  if (city) filter.city = { $regex: `^${city}$`, $options: 'i' };
  if (search) {
    filter.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { subCategories: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  // "Top in Pincode": shops in the searched PIN code, ordered by plan ranking
  // (Silver's priority local search and above come first).
  const pin = String(req.query.pincode || '').trim();
  if (/^\d{6}$/.test(pin)) {
    filter.pincode = pin;
    filter.$and = [notExpiredClause()];
    const skip = (pageNum - 1) * limitNum;
    const [businesses, total] = await Promise.all([
      findRankedSellers(filter, { fields: `${LIST_FIELDS} pincode`, skip, limit: limitNum }),
      Seller.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: businesses.map(publicSellerView),
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
      locationScope: { pincode: pin },
    });
  }

  // Plan reach: only sellers whose plan area covers the shopper's location
  // (with no location, only all-India plans) — see utils/sellerVisibility.js.
  filter.$and = [visibleSellerClause({ state, district, tehsil })];
  const locationScope = {
    state: typeof state === 'string' ? state.trim() : '',
    district: typeof district === 'string' ? district.trim() : '',
    tehsil: typeof tehsil === 'string' ? tehsil.trim() : '',
  };

  // Other sorts are explicit orders; "relevance" (default) is the shop
  // ranking in utils/sellerRanking.js.
  let sortBy = null;
  if (sort === 'rating') sortBy = { rankScore: -1, numRatings: -1 };
  if (sort === 'newest') sortBy = { createdAt: -1 };
  if (sort === 'popular') sortBy = { numRatings: -1, rankScore: -1, [RANKING_SORT_FIELD]: -1, isVerified: -1 };

  const skip = (pageNum - 1) * limitNum;
  const [businesses, total] = await Promise.all([
    sortBy
      ? Seller.find(filter).select(`${LIST_FIELDS} pincode`).sort(sortBy).skip(skip).limit(limitNum)
      : findRankedSellers(filter, { fields: `${LIST_FIELDS} pincode`, skip, limit: limitNum }),
    Seller.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: businesses.map(publicSellerView),
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
    locationScope,
  });
};

// @desc   Get a single business's full public profile (for the detail page)
// @route  GET /api/v1/businesses/:slug
// @access Public
exports.getBusinessProfile = async (req, res) => {
  const business = await Seller.findOne({ shopSlug: req.params.slug, status: 'approved' })
    .select('-bankDetails -kyc -totalEarnings -availableBalance -referralBalance -totalWithdrawn -rejectionReason -referralCode -paymentReference -paymentScreenshot -razorpayOrderId -razorpayPaymentId -offerPlanPaymentReference -offerPlanPaymentScreenshot');
  if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
  // Plan lapsed — hidden from listings, so the direct link goes offline too
  // until the seller renews.
  if (business.planExpiresAt && business.planExpiresAt <= new Date()) {
    return res.status(404).json({ success: false, message: 'This business is temporarily unavailable' });
  }

  // Similar businesses — same category & city, excluding this one
  // Similar shops that reach this business's own area
  const related = await Seller.find({
    status: 'approved',
    category: business.category,
    city: business.city,
    _id: { $ne: business._id },
    ...visibleSellerClause({ state: business.state, district: business.district, tehsil: business.tehsil }),
  })
    .select('shopName shopSlug logo lightLogo darkLogo category city avgRating numRatings')
    .limit(6);

  res.json({ success: true, data: publicSellerView(business), related });
};

// @desc   List distinct cities that have at least one approved business —
//         powers the location dropdown/autocomplete on the homepage.
// @route  GET /api/v1/businesses/cities
// @access Public
exports.getCities = async (req, res) => {
  const cities = await Seller.distinct('city', { status: 'approved', city: { $nin: ['', null] } });
  res.json({ success: true, data: cities.filter(Boolean).sort() });
};

// @desc   List distinct states that have at least one approved business —
//         first level of the State → District → Tehsil location picker.
// @route  GET /api/v1/businesses/states
// @access Public
exports.getStates = async (req, res) => {
  const states = await Seller.distinct('state', { status: 'approved', state: { $nin: ['', null] } });
  res.json({ success: true, data: states.filter(Boolean).sort() });
};

// @desc   List distinct districts within a state that have at least one
//         approved business — second level of the location picker.
// @route  GET /api/v1/businesses/districts?state=
// @access Public
exports.getDistricts = async (req, res) => {
  const { state } = req.query;
  const match = { status: 'approved', district: { $nin: ['', null] } };
  if (state) match.state = ciExact(state.trim());
  const districts = await Seller.distinct('district', match);
  res.json({ success: true, data: districts.filter(Boolean).sort() });
};

// @desc   List distinct tehsils within a district that have at least one
//         approved business — third level of the location picker.
// @route  GET /api/v1/businesses/tehsils?district=
// @access Public
exports.getTehsils = async (req, res) => {
  const { district } = req.query;
  const match = { status: 'approved', tehsil: { $nin: ['', null] } };
  if (district) match.district = ciExact(district.trim());
  const tehsils = await Seller.distinct('tehsil', match);
  res.json({ success: true, data: tehsils.filter(Boolean).sort() });
};

// @desc   Businesses grouped by category with a count — for homepage category grid
// @route  GET /api/v1/businesses/category-counts
// @access Public
exports.getCategoryCounts = async (req, res) => {
  const counts = await Seller.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $match: { _id: { $ne: null } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, data: counts.map(c => ({ category: c._id, count: c.count })) });
};