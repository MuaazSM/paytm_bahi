import { create } from 'zustand';
import type { Merchant } from '../api/types';

interface MerchantState {
  merchant: Merchant | null;
  token: string | null;
  setMerchant: (merchant: Merchant, token: string) => void;
  clear: () => void;
}

// Demo-mode seed — matches DATA_CONTRACTS.md §6 / the seeded backend exactly.
// The Onboarding screen is bypassed for the live demo (RootNavigator initial
// route is MainTabs), so screens read merchant.* from here on first render.
// Real login flow can still overwrite via setMerchant when re-enabled.
const DEMO_MERCHANT: Merchant = {
  id: 1,
  name: 'Ramesh Kirana Store',
  language: 'hi-IN',
  business_type: 'kirana',
};

export const useMerchantStore = create<MerchantState>((set) => ({
  merchant: DEMO_MERCHANT,
  token: 'demo-static-token',
  setMerchant: (merchant, token) => set({ merchant, token }),
  clear: () => set({ merchant: null, token: null }),
}));
