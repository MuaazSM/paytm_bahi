import { create } from 'zustand';
import type { Alert } from '../api/types';
import { dismissAlert as dismissAlertApi } from '../api';

interface AlertState {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlerts: (alerts: Alert[]) => void;
  /** Mark dismissed locally (no network). Useful for rollback / fixture tests. */
  markDismissed: (id: number) => void;
  /** Optimistic dismiss: flip locally, POST to backend, rollback on failure. */
  dismiss: (id: number) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlerts: (incoming) =>
    set((state) => {
      const existingIds = new Set(state.alerts.map((a) => a.id));
      const newOnes = incoming.filter((a) => !existingIds.has(a.id));
      return { alerts: [...state.alerts, ...newOnes] };
    }),
  markDismissed: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),
  dismiss: async (id) => {
    const prev = get().alerts;
    // Optimistic: hide it immediately
    set({ alerts: prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)) });
    try {
      await dismissAlertApi(id);
    } catch {
      // Rollback if the server didn't accept
      set({ alerts: prev });
    }
  },
}));
