import { create } from 'zustand';

interface MaintenanceStore {
  queueCount: number;
  setQueueCount: (count: number) => void;
}

export const useMaintenanceStore = create<MaintenanceStore>((set) => ({
  queueCount: 0,
  setQueueCount: (count) => set({ queueCount: count }),
}));
