// A seller's shopSlug is their storefront subdomain (<slug>.growthkarts.com),
// so it is just the shop name's letters and digits — no hyphens.
// Must stay in sync with RESERVED_SUBDOMAINS in frontend/src/utils/subdomain.js
// (a shop named "Admin" would otherwise become an unreachable store).
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'faq', 'blog', 'blogs', 'search'];

exports.normalizeShopName = (shopName) => {
  if (typeof shopName !== 'string') return '';
  return shopName
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\-_]+/g, ' ')
    .replace(/[\s\u00A0]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([,_/\\])\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

exports.shopSlugBase = (shopName) => {
  const normalized = exports.normalizeShopName(shopName);
  // 50 keeps room for a numeric suffix within the 63-char DNS label limit.
  const base = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 50);
  if (!base) return 'shop';
  return RESERVED_SUBDOMAINS.includes(base) ? `${base}shop` : base;
};
