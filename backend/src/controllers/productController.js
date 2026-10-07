const Product = require('../models/Product');
const Category = require('../models/Category');
const Seller = require('../models/Seller');
const { getVisibleSellerIds } = require('../utils/sellerVisibility');
const { publicProductVisibilityQuery } = require('../utils/productVisibility');
const { publicSellerView, publicSellerPopulate } = require('../utils/planCapabilities');
const User = require('../models/User');
const { ensureCategory, canonicalSub } = require('../utils/categoryResolver');
const { applyJewelleryPricing } = require('../utils/jewelleryPricing');

// A category / sub-category typed via "Other" becomes a real Category; the
// product stores the category's slug.
const applyCategory = async (body, addedBy) => {
  if (!body.category) return;
  const category = await ensureCategory(body.category, { subCategory: body.subCategory, addedBy });
  if (!category) return;
  body.category = category.slug;
  if (body.subCategory) body.subCategory = canonicalSub(category, body.subCategory);
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Product category/subcategory tree for site navigation (Navbar mega
//         menu + Shop page breadcrumb/chips) — built by aggregating what
//         actually exists in the Product collection, NOT from a separately
//         maintained taxonomy. This guarantees every nav link that appears
//         has at least one real product behind it: clicking "Men's Fashion"
//         (slug = the real `category` value on those products) or a
//         subcategory chip can never land on an empty "0 products" page,
//         because the chip only exists if a product with that exact
//         category+subCategory combination is live.
// @route  GET /api/v1/products/categories
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  men: "Men's Fashion",
  women: "Women's Fashion",
  kids: 'Kids Fashion',
  accessories: 'Accessories',
  electronics: 'Electronics',
  home: 'Home & Living',
  beauty: 'Beauty',
  sports: 'Sports & Fitness',
};
const titleCase = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

exports.getCategoryTree = async (req, res) => {
  const rows = await Product.aggregate([
    { $match: { isActive: true, approvalStatus: 'approved', category: { $nin: [null, ''] } } },
    { $group: { _id: { category: '$category', subCategory: '$subCategory' }, count: { $sum: 1 } } },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    const catKey = row._id.category;
    if (!map.has(catKey)) {
      map.set(catKey, {
        name: CATEGORY_LABELS[catKey] || titleCase(catKey),
        slug: catKey,
        count: 0,
        types: [],
        _seen: new Set(),
      });
    }
    const entry = map.get(catKey);
    entry.count += row.count;
    const sub = row._id.subCategory;
    if (sub && !entry._seen.has(sub)) {
      entry._seen.add(sub);
      entry.types.push(sub);
    }
  });

  // Cross-check against Admin/Super Admin's Category Management: a category
  // whose "Show in Navbar" toggle is off is excluded here even if it has live
  // products. Slugs with no matching Category doc (legacy/unmanaged) still
  // show by default, so nothing breaks for categories created before this
  // toggle existed.
  const managedCategories = await Category.find({}, 'slug name showInNavbar image typeImages').lean();
  const navVisibility = new Map(managedCategories.map(c => [c.slug, c.showInNavbar !== false]));
  // Prefer the name set in Category Management ("Food & Spices") over a
  // label derived from the slug ("Food-spices").
  const managedNames = new Map(managedCategories.map(c => [c.slug, c.name]));
  const managedMedia = new Map(managedCategories.map(c => [c.slug, { image: c.image || '', typeImages: c.typeImages || {} }]));

  const categories = Array.from(map.values())
    .filter(({ slug }) => navVisibility.get(slug) !== false)
    .map(c => ({ ...c, name: managedNames.get(c.slug) || c.name, ...(managedMedia.get(c.slug) || { image: '', typeImages: {} }) }))
    .sort((a, b) => b.count - a.count)
    .map(({ _seen, ...rest }) => ({ ...rest, types: rest.types.sort() }));

  res.json({ success: true, categories });
};

exports.getProducts = async (req, res) => {
  const {
    page = 1, limit = 12, category, subCategory, productType, brand,
    minPrice, maxPrice, size, color, sort = '-createdAt',
    search, isFeatured, isFlashSale, state, district, tehsil, sellerId,
    metal, purity, gender, hallmarked,
  } = req.query;

  // Only show products that are either Admin's own (approvalStatus defaults to
  // 'approved' for those) or a seller product Admin has explicitly approved —
  // keeps unapproved/rejected seller listings off the public directory.
  const query = publicProductVisibilityQuery();

  if (category) query.category = category;
  if (subCategory) query.subCategory = subCategory;
  if (productType) query.productType = productType;
  if (brand) query.brand = brand;
  if (isFeatured === 'true') query.isFeatured = true;
  if (isFlashSale === 'true') query.isFlashSale = true;
  if (size) query.sizes = { $in: [size] };
  if (color) query.colors = { $in: [color] };
  if (metal) query['jewellery.metal'] = { $in: String(metal).split(',') };
  if (purity) query['jewellery.purity'] = { $in: String(purity).split(',') };
  if (gender) query['jewellery.gender'] = { $in: String(gender).split(',') };
  if (hallmarked === 'true') query['jewellery.hallmarked'] = true;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (search) query.$text = { $search: search };
  if (sellerId) query.sellerId = sellerId;

  // Location-based seller visibility: a seller's products only show to a
  // shopper who is inside the area their subscription plan actually
  // reaches (Basic = own tehsil only, Silver = district, Gold = state,
  // Platinum = all India — see Seller.planSnapshot.visibilityScope).
  // Products with no sellerId are Admin's own catalog and are always
  // shown everywhere, regardless of location.
  const visibleSellerIds = await getVisibleSellerIds({ state, district, tehsil });
  query.$or = [{ sellerId: null }, { sellerId: { $in: visibleSellerIds } }];

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate(publicSellerPopulate())
      .sort(sort).skip(skip).limit(limitNum),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
};

// @desc   Admin/staff product management listing — every product in the
//         catalog (own + every seller's), with NO location-visibility or
//         approval-status filtering. This is what powers Admin's Product
//         Management page; the public getProducts above is what powers the
//         customer-facing Home/Shop pages.
// @route  GET /api/v1/products/admin/all
// @access Private/Admin
exports.getAllProductsAdmin = async (req, res) => {
  const { page = 1, limit = 15, search, from, to, owner } = req.query;
  const query = {};
  // owner=mine → products this Admin / Super Admin added; admins → products
  // of Admin staff accounts (Super Admin only); sellers → seller products.
  if (owner === 'mine') {
    query.sellerId = null;
    query.ownerAdmin = req.user._id;
  } else if (owner === 'admins' && req.user.role === 'superadmin') {
    query.sellerId = null;
    query.ownerAdmin = { $in: await User.find({ role: 'admin' }).distinct('_id') };
  } else if (owner === 'sellers') {
    query.sellerId = { $ne: null };
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = toDate;
    }
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate(publicSellerPopulate())
      .populate('ownerAdmin', 'name role')
      .sort('-createdAt').skip(skip).limit(limitNum),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('sellerId', 'shopName shopSlug logo phone status upiId qrCodeImage whatsapp planSnapshot.capabilities');
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  const out = product.toObject();
  if (out.sellerId && typeof out.sellerId === 'object') out.sellerId = publicSellerView(out.sellerId);
  res.json({ success: true, product: out });
};

// The seller's plan product limit applies to products Admin adds for them too.
const sellerLimitError = async (sellerId) => {
  const seller = await Seller.findById(sellerId).select('planSnapshot');
  const limit = seller?.planSnapshot?.productLimit;
  if (typeof limit !== 'number' || limit === -1) return null;
  const count = await Product.countDocuments({ sellerId });
  return count >= limit
    ? `This seller's "${seller.planSnapshot.name || 'current'}" plan allows up to ${limit} products and they already have ${count}.`
    : null;
};

exports.createProduct = async (req, res) => {
  if (req.body.sellerId) {
    const limitError = await sellerLimitError(req.body.sellerId);
    if (limitError) return res.status(403).json({ success: false, message: limitError });
  }
  await applyCategory(req.body, req.user.name);
  await applyJewelleryPricing(req.body);
  // Whoever creates an admin-catalog product owns it — customer payments for it
  // go to that admin's saved payment details. Never trust an ownerAdmin from the client.
  const product = await Product.create({ ...req.body, ownerAdmin: req.body.sellerId ? null : req.user._id });
  res.status(201).json({ success: true, product });
};

exports.updateProduct = async (req, res) => {
  delete req.body.ownerAdmin; // ownership can't be changed from the client
  if (req.body.sellerId) {
    const current = await Product.findById(req.params.id).select('sellerId');
    if (current && String(current.sellerId) !== String(req.body.sellerId)) {
      const limitError = await sellerLimitError(req.body.sellerId);
      if (limitError) return res.status(403).json({ success: false, message: limitError });
    }
  }
  await applyCategory(req.body, req.user.name);
  await applyJewelleryPricing(req.body);
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
};

exports.deleteProduct = async (req, res) => {
  // Hard delete, same as the seller panel — the old soft delete (isActive:false)
  // left the product in the admin list, so "Deleted" showed but nothing vanished.
  // Orders keep their own name/price snapshot, so history is unaffected.
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product deleted' });
};

exports.getFeaturedProducts = async (req, res) => {
  const { state, district, tehsil } = req.query;
  const visibleSellerIds = await getVisibleSellerIds({ state, district, tehsil });
  const products = await Product.find(publicProductVisibilityQuery({
    isFeatured: true,
    $or: [{ sellerId: null }, { sellerId: { $in: visibleSellerIds } }],
  }))
    .populate(publicSellerPopulate())
    .limit(16);
  res.json({ success: true, products });
};

exports.getFlashSaleProducts = async (req, res) => {
  const { state, district, tehsil } = req.query;
  const visibleSellerIds = await getVisibleSellerIds({ state, district, tehsil });
  const products = await Product.find(publicProductVisibilityQuery({
    isFlashSale: true,
    flashSaleEndsAt: { $gt: new Date() },
    $or: [{ sellerId: null }, { sellerId: { $in: visibleSellerIds } }],
  }))
    .populate(publicSellerPopulate())
    .limit(16);
  res.json({ success: true, products });
};

// ─── Variant Controllers ───────────────────────────────────────────────────────

exports.addVariant = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const variantData = req.body;

  // If first variant or isDefault requested, clear other defaults
  if (variantData.isDefault || product.variants.length === 0) {
    product.variants.forEach(v => { v.isDefault = false; });
    variantData.isDefault = true;
  }

  product.variants.push(variantData);

  // Sync legacy colors array from variants
  const activeColors = product.variants.filter(v => v.isActive).map(v => v.colorName);
  product.colors = [...new Set([...product.colors, ...activeColors])];

  await product.save();
  res.status(201).json({ success: true, product });
};

exports.updateVariant = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

  const updates = req.body;

  // If setting as default, clear others
  if (updates.isDefault) {
    product.variants.forEach(v => { v.isDefault = false; });
  }

  Object.assign(variant, updates);

  // Sync legacy colors array
  const activeColors = product.variants.filter(v => v.isActive).map(v => v.colorName);
  product.colors = [...new Set(activeColors)];

  await product.save();
  res.json({ success: true, product });
};

exports.deleteVariant = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

  variant.deleteOne();
  const remaining = product.variants.filter(v => v.isActive !== false);
  if (remaining.length) {
    product.colors = [...new Set(remaining.map(v => v.colorName))];
    if (!remaining.some(v => v.isDefault)) remaining[0].isDefault = true;
  }

  // Sync legacy colors array
  const activeColors = product.variants.filter(v => v.isActive).map(v => v.colorName);
  product.colors = [...new Set(activeColors)];

  await product.save();
  res.json({ success: true, message: 'Variant deleted', product });
};

exports.reorderVariantImages = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const variant = product.variants.id(req.params.variantId);
  if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });

  const { images } = req.body;
  if (!Array.isArray(images)) return res.status(400).json({ success: false, message: 'images must be an array' });

  variant.images = images;
  await product.save();
  res.json({ success: true, product });
};