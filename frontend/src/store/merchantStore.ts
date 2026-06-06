import { create } from 'zustand';
import type { Merchant } from '../api/types';

interface MerchantState {
  merchant: Merchant | null;
  token: string | null;
  setMerchant: (merchant: Merchant, token: string) => void;
  clear: () => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  merchant: null,
  token: null,
  setMerchant: (merchant, token) => set({ merchant, token }),
  clear: () => set({ merchant: null, token: null }),
}));
