// Detects a seller's storefront from the current hostname, Shopify-style
// (e.g. "my-shop.growthkarts.com" or, for local dev, "my-shop.localhost:5173").
// Chrome/Edge/Firefox resolve any "*.localhost" host to 127.0.0.1 automatically,
// so no DNS or hosts-file changes are needed to test subdomains in development.

const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'faq', 'blog', 'blogs', 'search'];
const RESERVED_PATHS = new Set([
  'shop', 'product', 'checkout', 'order-confirmation', 'order', 'orders', 'contact',
  'courier', 'login', 'register', 'wishlist', 'advertise', 'nearby', 'business',
  'my-account', 'admin', 'superadmin', 'seller', 'api',
  'privacy-policy', 'terms-and-conditions', 'faq', 'search', 'blog', 'blogs',
]);

// Returns the seller's shopSlug if the current URL is a store subdomain, else null.
export function getStoreSlugFromHost(hostname = window.location.hostname) {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1') return null;

  const parts = host.split('.');

  // "my-shop.localhost" -> ["my-shop", "localhost"]
  if (parts.length === 2 && parts[1] === 'localhost') {
    const sub = parts[0];
    return RESERVED_SUBDOMAINS.includes(sub) ? null : sub;
  }

  // Production: "my-shop.growthkarts.com" -> subdomain "my-shop".
  // Root domain itself ("growthkarts.com") has only 2 labels -> no subdomain.
  if (parts.length > 2) {
    const sub = parts[0];
    return RESERVED_SUBDOMAINS.includes(sub) ? null : sub;
  }

  return null;
}

// Returns the seller slug from a Meesho-style path such as /my-shop or
// /my-shop/product/123. Main application paths are excluded.
export function getStoreSlugFromPath(pathname = window.location.pathname) {
  const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (!firstSegment || RESERVED_PATHS.has(firstSegment) || !/^[a-z0-9-]+$/i.test(firstSegment)) return null;
  return firstSegment;
}

// Returns the root domain (without any store subdomain), e.g. "localhost" or "growthkarts.com".
function getRootDomain(hostname = window.location.hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return 'localhost';

  const parts = host.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') return 'localhost';
  // Strip an existing store subdomain (if we're already on one) to find the root domain.
  return parts.length > 2 ? parts.slice(1).join('.') : host;
}

// Builds the public store URL for a given shopSlug, matching the current
// protocol/root-domain/port so it works the same in dev and production.
export function getStoreUrl(shopSlug, hostname = window.location.hostname) {
  return `${getMainSiteUrl(hostname)}/${encodeURIComponent(String(shopSlug).toLowerCase())}`;
}

export function getStorePath(shopSlug, suffix = '') {
  const normalizedSuffix = suffix ? `/${String(suffix).replace(/^\/+/, '')}` : '';
  return `/${encodeURIComponent(String(shopSlug).toLowerCase())}${normalizedSuffix}`;
}

// Builds the URL back to the main marketplace site (no store subdomain).
export function getMainSiteUrl(hostname = window.location.hostname) {
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${getRootDomain(hostname)}${portSuffix}`;
}
