const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId, balance: 0 });
  return wallet;
};

const creditWallet = async (userId, amount, reason, { orderId, returnId } = {}) => {
  const wallet = await getOrCreateWallet(userId);
  wallet.balance += amount;
  await wallet.save();
  await WalletTransaction.create({
    user: userId, type: 'credit', amount, balanceAfter: wallet.balance, reason,
    order: orderId, return: returnId,
  });
  return wallet;
};

const debitWallet = async (userId, amount, reason, { orderId } = {}) => {
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < amount) throw new Error('Insufficient wallet balance');
  wallet.balance -= amount;
  await wallet.save();
  await WalletTransaction.create({
    user: userId, type: 'debit', amount, balanceAfter: wallet.balance, reason, order: orderId,
  });
  return wallet;
};

module.exports = { getOrCreateWallet, creditWallet, debitWallet };
