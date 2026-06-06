import { create } from 'zustand';
import type { Product } from '../api/types';

interface InventoryState {
  products: Product[];
  loading: boolean;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  updateProduct: (id: number, patch: Partial<Product>) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  loading: false,
  setProducts: (products) => set({ products }),
  setLoading: (loading) => set({ loading }),
  updateProduct: (id, patch) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
}));
