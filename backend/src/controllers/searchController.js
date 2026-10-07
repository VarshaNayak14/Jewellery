const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { publicProductVisibilityQuery } = require('../utils/productVisibility');
const { publicSellerView, RANKING_SORT_FIELD } = require('../utils/planCapabilities');
const { visibleSellerClause, getVisibleSellerIds } = require('../utils/sellerVisibility');
const { findRankedSellers } = require('../utils/sellerRanking');

// ─────────────────────────────────────────────────────────────────────────────
// JustDial-style unified search.
//
// One box, one query — the user types "restaurant", "plumber near me",
// "Sharma Electricals" and we return:
//   1. SHOPS    (Seller docs, status: approved)  ← primary result, like JustDial
//   2. CATEGORY suggestions (Category name / types matching the query)
//   3. PRODUCTS (secondary, so the e-commerce side still works)
//
// Location is respected exactly like /api/v1/businesses does: a seller (and
// their products) only appears if their plan's visibilityScope reaches the
// shopper's location — see utils/sellerVisibility.js.
// ─────────────────────────────────────────────────────────────────────────────

const escapeRx = (v = '') => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ciExact = (value) => ({ $regex: `^${escapeRx(value)}$`, $options: 'i' });
const ciLike = (value) => ({ $regex: escapeRx(value), $options: 'i' });

// Products of sellers the shopper can't see are hidden too; products with no
// sellerId are Admin's own catalog and always shown.
const productReachClause = async (loc) => ({
  $or: [{ sellerId: null }, { sellerId: { $in: await getVisibleSellerIds(loc) } }],
});

// A shop matches the free text if ANY of these hit. Matching on `category`
// and `subCategories` is what makes "restaurant" / "salon" / "electrician"
// return actual shops instead of nothing — same as JustDial.
const buildShopTextClause = (q) => ({
  $or: [
    { shopName: ciLike(q) },
    { description: ciLike(q) },
    { category: ciLike(q) },
    { subCategories: ciLike(q) },
    { city: ciLike(q) },
    { district: ciLike(q) },
    { tehsil: ciLike(q) },
    { address: ciLike(q) },
  ],
});

const SHOP_CARD_FIELDS =
  'shopName shopSlug logo lightLogo darkLogo banner bannerType description category subCategories ' +
  'city district state tehsil address phone whatsapp workingHours ' +
  'avgRating numRatings isVerified createdAt planSnapshot.capabilities';

const readLocation = (query) => ({
  state: typeof query.state === 'string' ? query.state.trim() : '',
  district: typeof query.district === 'string' ? query.district.trim() : '',
  tehsil: typeof query.tehsil === 'string' ? query.tehsil.trim() : '',
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Lightweight suggestions for the navbar dropdown (as-you-type).
// @route  GET /api/v1/search/suggest?q=&state=&district=&tehsil=
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.suggest = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.json({ success: true, shops: [], products: [], categories: [] });
  }

  const loc = readLocation(req.query);
  const shopFilter = { status: 'approved', ...buildShopTextClause(q), ...visibleSellerClause(loc) };
  const reach = await productReachClause(loc);

  const [shops, products, categoryDocs] = await Promise.all([
    Seller.find(shopFilter)
      .select('shopName shopSlug logo category city district avgRating numRatings isVerified phone')
      .sort({ isVerified: -1, avgRating: -1, numRatings: -1 })
      .limit(6)
      .lean(),

    Product.find(publicProductVisibilityQuery({
      $and: [reach, { $or: [{ name: ciLike(q) }, { brand: ciLike(q) }, { tags: ciLike(q) }] }],
    }))
      .select('name price images subCategory category')
      .limit(4)
      .lean(),

    Category.find({
      isActive: true,
      $or: [{ name: ciLike(q) }, { types: ciLike(q) }],
    })
      .select('name slug types')
      .limit(5)
      .lean(),
  ]);

  // Turn category hits into "Restaurants > Chinese" style quick chips
  const categories = [];
  categoryDocs.forEach((c) => {
    if (new RegExp(escapeRx(q), 'i').test(c.name)) {
      categories.push({ label: c.name, slug: c.slug, type: '' });
    }
    (c.types || [])
      .filter((t) => new RegExp(escapeRx(q), 'i').test(t))
      .slice(0, 3)
      .forEach((t) => categories.push({ label: `${t} · ${c.name}`, slug: c.slug, type: t }));
  });

  res.json({ success: true, shops, products, categories: categories.slice(0, 6) });
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Full search results page data.
// @route  GET /api/v1/search?q=&tab=all|shops|products&category=&subCategory=
//                &city=&state=&district=&tehsil=&sort=&page=&limit=
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.search = async (req, res) => {
  const {
    q = '',
    tab = 'all',
    category = '',
    subCategory = '',
    city = '',
    sort = 'relevance',
    page = 1,
    limit = 12,
  } = req.query;

  const query = q.trim();
  const loc = readLocation(req.query);
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const skip = (pageNum - 1) * limitNum;

  // ── SHOPS ────────────────────────────────────────────────────────────────
  const shopFilter = { status: 'approved' };
  if (query) Object.assign(shopFilter, buildShopTextClause(query));
  if (category) shopFilter.category = ciExact(category);
  if (subCategory) shopFilter.subCategories = ciLike(subCategory);
  if (city) shopFilter.city = ciExact(city);

  Object.assign(shopFilter, visibleSellerClause(loc));

  // Relevance (default) = the shop ranking in utils/sellerRanking.js.
  let shopSort = null;
  if (sort === 'rating') shopSort = { rankScore: -1, numRatings: -1 };
  if (sort === 'newest') shopSort = { createdAt: -1 };
  if (sort === 'name') shopSort = { shopName: 1 };

  // ── PRODUCTS ─────────────────────────────────────────────────────────────
  const productFilter = publicProductVisibilityQuery({ $and: [await productReachClause(loc)] });
  if (query) {
    productFilter.$or = [
      { name: ciLike(query) },
      { description: ciLike(query) },
      { brand: ciLike(query) },
      { tags: ciLike(query) },
      { category: ciLike(query) },
      { subCategory: ciLike(query) },
    ];
  }
  if (category) productFilter.category = ciExact(category);
  if (subCategory) productFilter.subCategory = ciExact(subCategory);

  let productSort = { ratings: -1, numReviews: -1 };
  if (sort === 'price-low') productSort = { price: 1 };
  if (sort === 'price-high') productSort = { price: -1 };
  if (sort === 'newest') productSort = { createdAt: -1 };

  const wantShops = tab === 'all' || tab === 'shops';
  const wantProducts = tab === 'all' || tab === 'products';

  const [shops, shopTotal, products, productTotal] = await Promise.all([
    wantShops
      ? (shopSort
        ? Seller.find(shopFilter).select(SHOP_CARD_FIELDS).sort(shopSort).skip(tab === 'shops' ? skip : 0).limit(limitNum).lean()
        : findRankedSellers(shopFilter, { fields: SHOP_CARD_FIELDS, skip: tab === 'shops' ? skip : 0, limit: limitNum }))
      : [],
    Seller.countDocuments(shopFilter),
    wantProducts
      ? Product.find(productFilter)
          .select('name price originalPrice discount images category subCategory ratings numReviews brand')
          .sort(productSort)
          .skip(tab === 'products' ? skip : 0)
          .limit(limitNum)
          .lean()
      : [],
    Product.countDocuments(productFilter),
  ]);

  const total = tab === 'products' ? productTotal : shopTotal;

  res.json({
    success: true,
    query,
    tab,
    shops: shops.map(publicSellerView),
    products,
    counts: { shops: shopTotal, products: productTotal },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.max(Math.ceil(total / limitNum), 1),
    },
    locationScope: loc,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Popular / trending search terms — used as chips under an empty box.
//         Derived from the actual categories + subcategories in the DB, so it
//         stays correct as admin adds/removes categories (nothing hardcoded).
// @route  GET /api/v1/search/popular
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.popular = async (req, res) => {
  const [categories, topCats] = await Promise.all([
    Category.find({ isActive: true }).select('name slug types').sort({ name: 1 }).lean(),
    Seller.aggregate([
      { $match: { status: 'approved', category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]),
  ]);

  res.json({
    success: true,
    categories,
    topCategories: topCats.map((c) => ({ category: c._id, count: c.count })),
  });
};