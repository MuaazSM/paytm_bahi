import { create } from 'zustand';
import type { Alert } from '../api/types';

interface AlertState {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlerts: (alerts: Alert[]) => void;
  dismissAlert: (id: number) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlerts: (incoming) =>
    set((state) => {
      const existingIds = new Set(state.alerts.map((a) => a.id));
      const newOnes = incoming.filter((a) => !existingIds.has(a.id));
      return { alerts: [...state.alerts, ...newOnes] };
    }),
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),
}));
