import { create } from 'zustand';
import { cartAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getEffectiveProductPrice, getLineVariant } from '../utils/helpers';

// Cart works for guests too: without a login the cart lives in localStorage
// (same shape as the server cart, so CartDrawer renders it unchanged). On
// login/register, fetchCart() merges those guest items into the account's
// server cart. Checkout itself still requires login.
const GUEST_KEY = 'growthkarts_guest_cart';
const EMPTY = { items: [] };

const isLoggedIn = () => {
  try { return Boolean(localStorage.getItem('growthkarts_token')); } catch { return false; }
};
const readGuestCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(GUEST_KEY));
    return Array.isArray(cart?.items) ? cart : EMPTY;
  } catch { return EMPTY; }
};
const writeGuestCart = (cart) => {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(cart)); } catch { /* storage full/blocked — keep in memory */ }
  return cart;
};
const clearGuestCart = () => {
  try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
};

// Only what the drawer/checkout needs — keeps localStorage small.
const slimProduct = (p) => ({
  _id: p._id, name: p.name, images: p.images, price: p.price, originalPrice: p.originalPrice,
  discount: p.discount, variants: p.variants, deliveryCharge: p.deliveryCharge, stock: p.stock,
  sizes: p.sizes, colors: p.colors, codAvailable: p.codAvailable,
  isFlashSale: p.isFlashSale, flashSalePrice: p.flashSalePrice, flashSaleEndsAt: p.flashSaleEndsAt,
  sellerId: p.sellerId && typeof p.sellerId === 'object' ? { _id: p.sellerId._id, shopName: p.sellerId.shopName, shopSlug: p.sellerId.shopSlug } : p.sellerId,
});

let merging = null; // guards against two parallel merges (App + storefront navbar both call fetchCart)

export const useCartStore = create((set, get) => ({
  cart: isLoggedIn() ? null : readGuestCart(),
  isOpen: false,
  isLoading: false,

  // Plain functions, not object-literal getters — see wishlistStore.js for
  // why a getter here would freeze at its first computed value instead of
  // updating on every set().
  itemCount: () => get().cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,

  subtotal: () => get().cart?.items?.reduce((sum, item) => {
    const price = Number(item.price) || getEffectiveProductPrice(item.product);
    return sum + price * item.quantity;
  }, 0) || 0,

  isGuestCart: () => !isLoggedIn(),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set(state => ({ isOpen: !state.isOpen })),

  fetchCart: async () => {
    if (!isLoggedIn()) { set({ cart: readGuestCart() }); return; }
    try {
      // Just logged in with items added as a guest → move them to the account cart first.
      const guestItems = readGuestCart().items;
      if (guestItems.length) {
        merging = merging || (async () => {
          clearGuestCart();
          for (const item of guestItems) {
            try {
              await cartAPI.add({ productId: item.product?._id, quantity: item.quantity, size: item.size, color: item.color });
            } catch { /* out of stock / removed product — skip it */ }
          }
          toast.success('Items from your cart were saved to your account');
        })();
        await merging;
        merging = null;
      }
      const data = await cartAPI.get();
      set({ cart: data.cart });
    } catch { /* keep whatever we had */ }
  },

  // Called when the user logs out: fall back to an (empty) guest cart.
  resetToGuest: () => set({ cart: readGuestCart(), isOpen: false }),

  addToCart: async (productId, quantity = 1, size, color) => {
    set({ isLoading: true });
    try {
      if (!isLoggedIn()) {
        const { product } = await productAPI.getOne(productId);
        if (!product) throw new Error('Product not found');
        const cart = readGuestCart();
        const existing = cart.items.find(i => i.product?._id === productId && (i.size || '') === (size || '') && (i.color || '') === (color || ''));
        const items = existing
          ? cart.items.map(i => (i === existing ? { ...i, quantity: i.quantity + quantity } : i))
          : [...cart.items, {
            _id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            product: slimProduct(product),
            quantity, size, color,
            price: getEffectiveProductPrice(product, getLineVariant(product, color)),
          }];
        set({ cart: writeGuestCart({ items }), isOpen: true, isLoading: false });
        toast.success('Added to cart!');
        return;
      }
      const data = await cartAPI.add({ productId, quantity, size, color });
      set({ cart: data.cart, isOpen: true, isLoading: false });
      toast.success('Added to cart!');
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to add to cart');
    }
  },

  updateQuantity: async (itemId, quantity) => {
    if (!isLoggedIn()) {
      const cart = readGuestCart();
      const items = quantity < 1
        ? cart.items.filter(i => i._id !== itemId)
        : cart.items.map(i => (i._id === itemId ? { ...i, quantity } : i));
      set({ cart: writeGuestCart({ items }) });
      return;
    }
    try {
      const data = await cartAPI.update(itemId, { quantity });
      set({ cart: data.cart });
    } catch (error) {
      toast.error(error.message || 'Failed to update cart');
    }
  },

  removeItem: async (itemId) => {
    if (!isLoggedIn()) {
      const cart = readGuestCart();
      set({ cart: writeGuestCart({ items: cart.items.filter(i => i._id !== itemId) }) });
      toast.success('Item removed');
      return;
    }
    try {
      const data = await cartAPI.remove(itemId);
      set({ cart: data.cart });
      toast.success('Item removed');
    } catch (error) {
      toast.error(error.message || 'Failed to remove item');
    }
  },

  clearCart: async () => {
    if (!isLoggedIn()) { clearGuestCart(); set({ cart: { items: [] } }); return; }
    try {
      await cartAPI.clear();
      set({ cart: { items: [] } });
    } catch {}
  },
}));
