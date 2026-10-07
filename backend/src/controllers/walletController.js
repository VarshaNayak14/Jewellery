const { getOrCreateWallet } = require('../services/walletService');
const WalletTransaction = require('../models/WalletTransaction');

exports.getMyWallet = async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  res.json({ success: true, wallet });
};

exports.getMyTransactions = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ user: req.user._id }).sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('order', 'orderNumber'),
    WalletTransaction.countDocuments({ user: req.user._id }),
  ]);
  res.json({ success: true, transactions, total });
};
