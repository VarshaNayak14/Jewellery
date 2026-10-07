// A shopper who isn't logged in yet can still tap "Add to Cart" or the
// wishlist heart — we stash what they meant to do here, then replay it once
// they finish logging in (or registering), instead of just dropping them on
// the login page having lost their place.
const CART_KEY = 'growthkarts_pending_cart';
const WISHLIST_KEY = 'growthkarts_pending_wishlist';

export const savePendingCart = (productId, quantity, size, color) => {
  try { sessionStorage.setItem(CART_KEY, JSON.stringify({ productId, quantity, size, color })); } catch { /* ignore */ }
};

export const savePendingWishlist = (productId) => {
  try { sessionStorage.setItem(WISHLIST_KEY, productId); } catch { /* ignore */ }
};

// Call right after a successful login/register. Returns true if anything was
// replayed, so the caller can show a confirmation toast.
export const consumePendingActions = ({ addToCart, toggleWishlist }) => {
  let didSomething = false;
  try {
    const cartRaw = sessionStorage.getItem(CART_KEY);
    if (cartRaw) {
      sessionStorage.removeItem(CART_KEY);
      const { productId, quantity, size, color } = JSON.parse(cartRaw);
      if (productId) { addToCart(productId, quantity || 1, size, color); didSomething = true; }
    }
    const wishlistId = sessionStorage.getItem(WISHLIST_KEY);
    if (wishlistId) {
      sessionStorage.removeItem(WISHLIST_KEY);
      toggleWishlist(wishlistId);
      didSomething = true;
    }
  } catch { /* ignore */ }
  return didSomething;
};
