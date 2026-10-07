const Wishlist = require('../models/Wishlist');

exports.getWishlist = async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
  if (!wishlist) wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  res.json({ success: true, wishlist });
};

exports.toggleWishlist = async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });

  const index = wishlist.products.indexOf(productId);
  let action;
  if (index > -1) { wishlist.products.splice(index, 1); action = 'removed'; }
  else { wishlist.products.push(productId); action = 'added'; }

  await wishlist.save();
  res.json({ success: true, action, message: `Product ${action} ${action === 'added' ? 'to' : 'from'} wishlist` });
};

exports.clearWishlist = async (req, res) => {
  await Wishlist.findOneAndUpdate({ user: req.user._id }, { products: [] });
  res.json({ success: true, message: 'Wishlist cleared' });
};
