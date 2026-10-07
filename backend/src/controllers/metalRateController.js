const MetalRate = require('../models/MetalRate');
const { PURITIES, recalculateLivePrices, ensureDefaultRates } = require('../utils/jewelleryPricing');

// GET /metal-rates — public: today's rates (navbar ticker, product page, panels)
exports.getRates = async (req, res) => {
  await ensureDefaultRates();
  const rates = await MetalRate.find().sort({ metal: 1, ratePerGram: -1 }).populate('updatedBy', 'name');
  const updatedAt = rates.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), new Date(0));
  res.json({ success: true, rates, purities: PURITIES, updatedAt: rates.length ? updatedAt : null });
};

// PUT /metal-rates — Admin / Super Admin: save rates, then re-price live products
// body: { rates: [{ metal, purity, ratePerGram }] }
exports.updateRates = async (req, res) => {
  const list = Array.isArray(req.body.rates) ? req.body.rates : [];
  if (!list.length) return res.status(400).json({ success: false, message: 'No rates sent' });

  for (const r of list) {
    const ratePerGram = Number(r.ratePerGram);
    if (!PURITIES[r.metal] || !r.purity || !Number.isFinite(ratePerGram) || ratePerGram <= 0) {
      return res.status(400).json({ success: false, message: `Invalid rate for ${r.metal || '?'} ${r.purity || ''}` });
    }
  }

  await MetalRate.bulkWrite(list.map((r) => ({
    updateOne: {
      filter: { metal: r.metal, purity: String(r.purity).trim() },
      update: { $set: { ratePerGram: Number(r.ratePerGram), updatedBy: req.user._id } },
      upsert: true,
    },
  })));

  const result = await recalculateLivePrices();
  const rates = await MetalRate.find().sort({ metal: 1, ratePerGram: -1 }).populate('updatedBy', 'name');
  res.json({ success: true, rates, repriced: result.updated, message: `Rates saved · ${result.updated} live-priced products updated` });
};

// DELETE /metal-rates/:id — remove a purity you no longer sell
exports.deleteRate = async (req, res) => {
  const rate = await MetalRate.findByIdAndDelete(req.params.id);
  if (!rate) return res.status(404).json({ success: false, message: 'Rate not found' });
  res.json({ success: true, message: 'Rate removed' });
};

// POST /metal-rates/recalculate — re-price live products without changing rates
exports.recalculate = async (req, res) => {
  const result = await recalculateLivePrices();
  res.json({ success: true, ...result, message: `${result.updated} live-priced products updated` });
};
