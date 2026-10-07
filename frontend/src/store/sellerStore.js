import { create } from 'zustand';
import { sellerAPI } from '../services/api';

// Read synchronously at store-creation time so isSellerAuthenticated is already
// correct on the first render after a refresh — doing this only in a useEffect
// leaves a one-tick window where SellerRoute sees false and redirects to login.
const getStoredSeller = () => {
  const token = localStorage.getItem('growthkarts_seller_token');
  const sellerStr = localStorage.getItem('growthkarts_seller');
  const sellerUserStr = localStorage.getItem('growthkarts_seller_user');
  if (token && sellerStr) {
    try {
      const seller = JSON.parse(sellerStr);
      const sellerUser = sellerUserStr ? JSON.parse(sellerUserStr) : null;
      return { token, seller, sellerUser, isSellerAuthenticated: true };
    } catch {
      localStorage.removeItem('growthkarts_seller_token');
      localStorage.removeItem('growthkarts_seller');
      localStorage.removeItem('growthkarts_seller_user');
    }
  }
  return { token: null, seller: null, sellerUser: null, isSellerAuthenticated: false };
};

export const useSellerStore = create((set, get) => ({
  ...getStoredSeller(),
  isLoading: false,
  // How far this seller's shop currently reaches (tehsil/district/state/india)
  // and whether it's temporarily hidden because their plan expired. Not
  // persisted — always refetched, since it can flip purely by time passing
  // (plan expiry) without the seller doing anything.
  visibility: null,

  initSeller: () => {
    const stored = getStoredSeller();
    set(stored);
    // The cached copy can go stale the moment admin approves KYC, changes
    // commission, or updates status — refresh from the server in the background
    // so an already-logged-in seller sees those changes without re-logging in.
    if (stored.isSellerAuthenticated) get().refreshSeller();
  },

  refreshSeller: async () => {
    try {
      const data = await sellerAPI.getMe();
      if (data.seller) {
        localStorage.setItem('growthkarts_seller', JSON.stringify(data.seller));
        if (data.user) localStorage.setItem('growthkarts_seller_user', JSON.stringify(data.user));
        set({ seller: data.seller, sellerUser: data.user || get().sellerUser, visibility: data.visibility ?? null });
      }
    } catch { /* token invalid/expired — leave cached state, protected routes will handle it */ }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await sellerAPI.login(credentials);
      localStorage.setItem('growthkarts_seller_token', data.token);
      localStorage.setItem('growthkarts_seller', JSON.stringify(data.seller));
      localStorage.setItem('growthkarts_seller_user', JSON.stringify(data.user));
      set({ 
        seller: data.seller, 
        sellerUser: data.user, 
        token: data.token, 
        isSellerAuthenticated: true, 
        isLoading: false
      });
      // Login payload is trimmed (no light/dark logos etc.) — pull the full profile.
      get().refreshSeller();
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.message, status: error.status };
    }
  },

  logout: () => {
    localStorage.removeItem('growthkarts_seller_token');
    localStorage.removeItem('growthkarts_seller');
    localStorage.removeItem('growthkarts_seller_user');
    set({ seller: null, sellerUser: null, token: null, isSellerAuthenticated: false });
  },

  updateSeller: (sellerData, visibility) => {
    const updated = { ...get().seller, ...sellerData };
    localStorage.setItem('growthkarts_seller', JSON.stringify(updated));
    set({ seller: updated, ...(visibility !== undefined ? { visibility } : {}) });
  },
  updateSellerUser: (userData) => {
    localStorage.setItem('growthkarts_seller_user', JSON.stringify(userData));
    set({ sellerUser: userData });
  },
}));