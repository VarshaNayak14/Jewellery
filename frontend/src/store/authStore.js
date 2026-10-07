import { create } from 'zustand';
import { authAPI } from '../services/api';

// Read localStorage synchronously at store-creation time (not in a useEffect) so
// isAuthenticated is already correct on the very first render after a refresh —
// otherwise route guards see isAuthenticated=false for one tick and redirect to
// /login before the effect runs, which looks like getting logged out on refresh.
const getStoredAuth = () => {
  const token = localStorage.getItem('growthkarts_token');
  const userStr = localStorage.getItem('growthkarts_user');
  if (token && userStr) {
    try {
      return { token, user: JSON.parse(userStr), isAuthenticated: true };
    } catch { localStorage.clear(); }
  }
  return { token: null, user: null, isAuthenticated: false };
};

export const useAuthStore = create((set, get) => ({
  ...getStoredAuth(),
  isLoading: false,

  initAuth: () => {
    const stored = getStoredAuth();
    set(stored);
    // The cached copy goes stale the moment a Super Admin changes this admin's
    // permissions (or blocks a user) — refresh from the server in the background
    // so an already-logged-in session picks up the change without re-logging in.
    if (stored.isAuthenticated) get().refreshUser();
  },

  refreshUser: async () => {
    try {
      const data = await authAPI.getMe();
      if (data.user) {
        localStorage.setItem('growthkarts_user', JSON.stringify(data.user));
        set({ user: data.user });
      }
    } catch { /* token invalid/expired — leave cached state, protected routes will handle it */ }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await authAPI.login(credentials);
      localStorage.setItem('growthkarts_token', data.token);
      localStorage.setItem('growthkarts_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.message };
    }
  },

  register: async (userData) => {
    set({ isLoading: true });
    try {
      const data = await authAPI.register(userData);
      localStorage.setItem('growthkarts_token', data.token);
      localStorage.setItem('growthkarts_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.message };
    }
  },

  logout: () => {
    localStorage.removeItem('growthkarts_token');
    localStorage.removeItem('growthkarts_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    const updated = { ...get().user, ...userData };
    localStorage.setItem('growthkarts_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));
