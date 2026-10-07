// Seller stores live on Meesho-style paths of the main site (/my-shop,
// /my-shop/product/123) — never on subdomains — so the site works the same on
// any host: localhost, *.vercel.app or a custom domain.

const RESERVED_PATHS = new Set([
  'shop', 'product', 'checkout', 'order-confirmation', 'order', 'orders', 'contact',
  'courier', 'login', 'register', 'wishlist', 'advertise', 'nearby', 'business',
  'my-account', 'admin', 'superadmin', 'seller', 'api',
  'privacy-policy', 'terms-and-conditions', 'faq', 'search', 'blog', 'blogs',
]);

// Stores are path-based only, so the hostname never selects a store. Kept so
// existing callers (hostSlug || pathSlug) keep working unchanged.
export function getStoreSlugFromHost() {
  return null;
}

// Returns the seller slug from a Meesho-style path such as /my-shop or
// /my-shop/product/123. Main application paths are excluded.
export function getStoreSlugFromPath(pathname = window.location.pathname) {
  const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (!firstSegment || RESERVED_PATHS.has(firstSegment) || !/^[a-z0-9-]+$/i.test(firstSegment)) return null;
  return firstSegment;
}

// The main site is always the current host.
function getRootDomain(hostname = window.location.hostname) {
  return hostname.toLowerCase();
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

// Builds the URL of the main marketplace site.
export function getMainSiteUrl(hostname = window.location.hostname) {
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${getRootDomain(hostname)}${portSuffix}`;
}
