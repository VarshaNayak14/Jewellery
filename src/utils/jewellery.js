// Shared jewellery constants + the same price formula the backend uses
// (backend/src/utils/jewelleryPricing.js) so forms can preview live prices.

export const METALS = [
  { value: 'gold', label: 'Yellow Gold', rateMetal: 'gold' },
  { value: 'rose-gold', label: 'Rose Gold', rateMetal: 'gold' },
  { value: 'white-gold', label: 'White Gold', rateMetal: 'gold' },
  { value: 'silver', label: 'Silver', rateMetal: 'silver' },
  { value: 'platinum', label: 'Platinum', rateMetal: 'platinum' },
  { value: 'other', label: 'Other / Fashion', rateMetal: null },
];

export const PURITIES = {
  gold: ['24K', '22K', '18K', '14K'],
  silver: ['999', '925'],
  platinum: ['950'],
};

export const METAL_LABEL = Object.fromEntries(METALS.map((m) => [m.value, m.label]));

export const GEMSTONES = ['Diamond', 'Lab-grown Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Pearl', 'Polki', 'Kundan', 'American Diamond (CZ)', 'Moissanite', 'None'];
export const CERTIFICATIONS = ['BIS Hallmark', 'IGI', 'GIA', 'SGL', 'GSI', 'HRD'];
export const OCCASIONS = ['Daily Wear', 'Office Wear', 'Bridal', 'Wedding', 'Festive', 'Engagement', 'Party', 'Gifting'];
export const RING_SIZES = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
export const BANGLE_SIZES = ['2.2', '2.4', '2.6', '2.8', '2.10'];

export const emptyJewellery = {
  metal: 'gold', purity: '22K', grossWeight: '', netWeight: '', stoneWeight: '',
  gemstone: '', diamondClarity: '', diamondColor: '', stoneCharges: '',
  makingChargeType: 'percent', makingCharge: '', gstPercent: 3,
  pricingMode: 'fixed', hallmarked: true, huid: '', certification: 'BIS Hallmark',
  certificateUrl: '', gender: 'women', occasion: '',
};

export const rateMapFrom = (rates = []) =>
  Object.fromEntries(rates.map((r) => [`${r.metal}:${r.purity}`, r.ratePerGram]));

export function computeBreakup(j, rateMap) {
  if (!j) return null;
  const rateMetal = METALS.find((m) => m.value === j.metal)?.rateMetal;
  const netWeight = Number(j.netWeight) || 0;
  if (!rateMetal || !j.purity || netWeight <= 0) return null;
  const rate = rateMap[`${rateMetal}:${j.purity}`];
  if (!rate) return null;
  const metalValue = netWeight * rate;
  const making = Number(j.makingCharge) || 0;
  const makingCharges = j.makingChargeType === 'per_gram' ? netWeight * making
    : j.makingChargeType === 'fixed' ? making
    : (metalValue * making) / 100;
  const stoneCharges = Number(j.stoneCharges) || 0;
  const subtotal = metalValue + makingCharges + stoneCharges;
  const gst = (subtotal * (Number(j.gstPercent ?? 3) || 0)) / 100;
  return { rateUsed: rate, metalValue, makingCharges, stoneCharges, gst, total: Math.round(subtotal + gst) };
}

// Form state (strings) → API payload (numbers)
export function jewelleryPayload(j) {
  if (!j) return undefined;
  const num = (v) => (v === '' || v == null ? undefined : Number(v));
  return {
    ...j,
    grossWeight: num(j.grossWeight),
    netWeight: num(j.netWeight),
    stoneWeight: num(j.stoneWeight),
    stoneCharges: Number(j.stoneCharges) || 0,
    makingCharge: Number(j.makingCharge) || 0,
    gstPercent: j.gstPercent === '' ? 3 : Number(j.gstPercent),
    priceBreakup: undefined,
  };
}

// API product → form state
export function jewelleryFormFrom(p) {
  const j = p?.jewellery || {};
  const out = { ...emptyJewellery };
  Object.keys(emptyJewellery).forEach((k) => {
    if (j[k] !== undefined && j[k] !== null) out[k] = j[k];
  });
  if (!j.metal) { out.metal = ''; out.purity = ''; out.hallmarked = false; out.certification = ''; }
  return out;
}

export const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
