import { create } from 'zustand';
import { wishlistAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useWishlistStore = create((set, get) => ({
  wishlist: null,
  isLoading: false,

  // NOTE: these must stay plain functions, not object-literal getters —
  // Zustand's set() merges via Object.assign, which reads a getter's CURRENT
  // value and bakes it in as a static property on the new state object. A
  // getter here would freeze at whatever `wishlist` was on the first ever
  // set() call and never update again, while `wishlist` itself keeps
  // updating fine (exactly the "badge count right, list empty" bug this
  // used to cause). Call these as get().productIds() / get().items().
  productIds: () => get().wishlist?.products?.map(p => p._id || p) || [],

  items: () => get().wishlist?.products || [],

  isInWishlist: (productId) => {
    const ids = get().wishlist?.products?.map(p => (p._id || p).toString()) || [];
    return ids.includes(productId.toString());
  },

  fetchWishlist: async () => {
    try {
      const data = await wishlistAPI.get();
      set({ wishlist: data.wishlist || data });
    } catch {
      set({ wishlist: null });
    }
  },

  toggleWishlist: async (productId) => {
    set({ isLoading: true });
    try {
      const data = await wishlistAPI.toggle(productId);
      await get().fetchWishlist();
      toast.success(data.action === 'added' ? '❤️ Added to wishlist' : 'Removed from wishlist');
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to update wishlist');
    }
  },

  removeFromWishlist: async (productId) => {
    set({ isLoading: true });
    try {
      await wishlistAPI.remove(productId);
      await get().fetchWishlist();
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to remove from wishlist');
    }
  },

  clearWishlist: async () => {
    try {
      await wishlistAPI.clear();
      set({ wishlist: { products: [] } });
    } catch {}
  },
}));
