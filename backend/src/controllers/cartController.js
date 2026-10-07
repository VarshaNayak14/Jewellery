const Cart = require('../models/Cart');
const Product = require('../models/Product');

const getEffectiveProductPrice = (product) => {
  if (!product) return 0;

  if (
    product.isFlashSale &&
    product.flashSalePrice !== undefined &&
    product.flashSalePrice !== null &&
    (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt) > new Date())
  ) {
    return Number(product.flashSalePrice || 0);
  }

  return Number(product.price || 0);
};

exports.getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    populate: { path: 'sellerId', select: 'shopName shopSlug upiId qrCodeImage status kyc.status planSnapshot.capabilities.directPayment' },
  });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
  res.json({ success: true, cart });
};

// The active colour variant a cart line refers to (null for plain products).
const variantFor = (product, color) => {
  const active = (product.variants || []).filter(v => v.isActive !== false);
  if (!active.length) return null;
  return active.find(v => v.colorName === color) || null;
};

exports.addToCart = async (req, res) => {
  const { productId, quantity = 1, size } = req.body;
  let { color } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  // Colour products: a chosen colour's own price and stock apply. No colour
  // means the product itself ("Main") — unless it has no photos of its own,
  // then its default colour.
  const activeVariants = (product.variants || []).filter(v => v.isActive !== false);
  if (activeVariants.length && !variantFor(product, color)) {
    color = product.images?.length ? '' : (activeVariants.find(v => v.isDefault) || activeVariants[0]).colorName;
  }
  const variant = variantFor(product, color);
  const stock = variant ? variant.stock : product.stock;
  if (typeof stock === 'number' && stock <= 0) {
    return res.status(400).json({ success: false, message: variant ? `${color} is out of stock` : 'This product is out of stock' });
  }
  const unitPrice = variant ? Number(variant.price) : getEffectiveProductPrice(product);

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId && item.size === size && item.color === color
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity, size, color, price: unitPrice });
  }

  await cart.save();
  await cart.populate({
    path: 'items.product',
    populate: { path: 'sellerId', select: 'shopName shopSlug upiId qrCodeImage status kyc.status planSnapshot.capabilities.directPayment' },
  });
  res.json({ success: true, cart });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  if (quantity <= 0) {
    cart.items.pull(req.params.itemId);
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate({
    path: 'items.product',
    populate: { path: 'sellerId', select: 'shopName shopSlug upiId qrCodeImage status kyc.status planSnapshot.capabilities.directPayment' },
  });
  res.json({ success: true, cart });
};

exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
  cart.items.pull(req.params.itemId);
  await cart.save();
  await cart.populate({
    path: 'items.product',
    populate: { path: 'sellerId', select: 'shopName shopSlug upiId qrCodeImage status kyc.status planSnapshot.capabilities.directPayment' },
  });
  res.json({ success: true, cart });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ success: true, message: 'Cart cleared' });
};
