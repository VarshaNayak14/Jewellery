import { create } from 'zustand';
import { walletAPI } from '../services/api';

export const useWalletStore = create((set, get) => ({
  wallet: null,
  transactions: [],
  isLoading: false,

  fetchWallet: async () => {
    try {
      const data = await walletAPI.get();
      set({ wallet: data.wallet });
    } catch {
      set({ wallet: null });
    }
  },

  fetchTransactions: async (params) => {
    set({ isLoading: true });
    try {
      const data = await walletAPI.getTransactions(params);
      set({ transactions: data.transactions || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
