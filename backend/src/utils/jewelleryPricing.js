const MetalRate = require('../models/MetalRate');

// Purities offered in the panels' dropdowns, per metal.
const PURITIES = {
  gold: ['24K', '22K', '18K', '14K'],
  silver: ['999', '925'],
  platinum: ['950'],
};

// Rose and white gold are priced off the gold rate of the same purity.
const RATE_METAL = { gold: 'gold', 'rose-gold': 'gold', 'white-gold': 'gold', silver: 'silver', platinum: 'platinum' };

const DEFAULT_RATES = [
  { metal: 'gold', purity: '24K', ratePerGram: 7400 },
  { metal: 'gold', purity: '22K', ratePerGram: 6780 },
  { metal: 'gold', purity: '18K', ratePerGram: 5550 },
  { metal: 'gold', purity: '14K', ratePerGram: 4330 },
  { metal: 'silver', purity: '999', ratePerGram: 95 },
  { metal: 'silver', purity: '925', ratePerGram: 88 },
  { metal: 'platinum', purity: '950', ratePerGram: 3200 },
];

const round2 = (n) => Math.round(n * 100) / 100;

// { 'gold:22K': 6780, ... }
const loadRateMap = async () => {
  const rates = await MetalRate.find().lean();
  return Object.fromEntries(rates.map((r) => [`${r.metal}:${r.purity}`, r.ratePerGram]));
};

/**
 * Works out the price of one piece from its metal weight, today's rate,
 * making charges, stone charges and GST. Returns null when the piece can't
 * be priced live (no metal/weight, or no rate saved for that purity).
 */
const computeBreakup = (j, rateMap) => {
  if (!j) return null;
  const rateMetal = RATE_METAL[j.metal];
  const netWeight = Number(j.netWeight) || 0;
  if (!rateMetal || !j.purity || netWeight <= 0) return null;
  const rate = rateMap[`${rateMetal}:${j.purity}`];
  if (!rate) return null;

  const metalValue = netWeight * rate;
  const making = Number(j.makingCharge) || 0;
  let makingCharges = 0;
  if (j.makingChargeType === 'per_gram') makingCharges = netWeight * making;
  else if (j.makingChargeType === 'fixed') makingCharges = making;
  else makingCharges = (metalValue * making) / 100; // percent (default)

  const stoneCharges = Number(j.stoneCharges) || 0;
  const subtotal = metalValue + makingCharges + stoneCharges;
  const gstPercent = j.gstPercent ?? 3;
  const gst = (subtotal * gstPercent) / 100;

  return {
    rateUsed: rate,
    metalValue: round2(metalValue),
    makingCharges: round2(makingCharges),
    stoneCharges: round2(stoneCharges),
    gst: round2(gst),
    total: Math.round(subtotal + gst),
    computedAt: new Date(),
  };
};

/**
 * Call on a product create/update body before saving. For "live" pieces it
 * fills jewellery.priceBreakup and sets `price` from today's rates, so the
 * seller/admin doesn't type the price by hand.
 */
const applyJewelleryPricing = async (body, rateMap) => {
  const j = body?.jewellery;
  if (!j || j.pricingMode !== 'live') return body;
  const breakup = computeBreakup(j, rateMap || await loadRateMap());
  if (!breakup) {
    const err = new Error('Live price needs a metal, purity, net weight and a saved rate for that purity. Add the rate under Gold Rates, or switch to fixed price.');
    err.statusCode = 400;
    throw err;
  }
  j.priceBreakup = breakup;
  body.price = breakup.total;
  if (body.originalPrice && Number(body.originalPrice) > breakup.total) {
    body.discount = Math.round(((body.originalPrice - breakup.total) / body.originalPrice) * 100);
  } else {
    body.originalPrice = undefined;
    body.discount = 0;
  }
  return body;
};

// Re-price every live-priced product. Run after rates change.
const recalculateLivePrices = async () => {
  const Product = require('../models/Product');
  const rateMap = await loadRateMap();
  const products = await Product.find({ 'jewellery.pricingMode': 'live' })
    .select('jewellery price originalPrice discount').lean();
  const ops = [];
  for (const p of products) {
    const breakup = computeBreakup(p.jewellery, rateMap);
    if (!breakup) continue;
    const set = { price: breakup.total, 'jewellery.priceBreakup': breakup };
    if (p.originalPrice && p.originalPrice > breakup.total) {
      set.discount = Math.round(((p.originalPrice - breakup.total) / p.originalPrice) * 100);
    } else {
      set.discount = 0;
    }
    ops.push({ updateOne: { filter: { _id: p._id }, update: { $set: set } } });
  }
  if (ops.length) await Product.bulkWrite(ops);
  return { updated: ops.length, livePriced: products.length };
};

const ensureDefaultRates = async () => {
  const count = await MetalRate.countDocuments();
  if (count === 0) await MetalRate.insertMany(DEFAULT_RATES);
};

module.exports = {
  PURITIES, DEFAULT_RATES, loadRateMap, computeBreakup,
  applyJewelleryPricing, recalculateLivePrices, ensureDefaultRates,
};
