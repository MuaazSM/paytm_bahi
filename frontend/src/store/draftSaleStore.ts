import { create } from 'zustand';
import type { VoiceDraftResponse, DraftLineItem } from '../api/types';

interface DraftSaleState {
  draft: VoiceDraftResponse | null;
  setDraft: (draft: VoiceDraftResponse) => void;
  updateLineItem: (index: number, item: Partial<DraftLineItem>) => void;
  clearDraft: () => void;
}

export const useDraftSaleStore = create<DraftSaleState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateLineItem: (index, item) =>
    set((state) => {
      if (!state.draft) return state;
      const line_items = [...state.draft.line_items];
      line_items[index] = { ...line_items[index], ...item };
      const total_amount = line_items.reduce((sum, li) => sum + li.line_total, 0);
      return { draft: { ...state.draft, line_items, total_amount } };
    }),
  clearDraft: () => set({ draft: null }),
}));
