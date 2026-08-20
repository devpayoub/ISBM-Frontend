import { create } from 'zustand';

interface StockStore {
  ruptureCount: number;
  setRuptureCount: (count: number) => void;
}

export const useStockStore = create<StockStore>((set) => ({
  ruptureCount: 0,
  setRuptureCount: (count) => set({ ruptureCount: count }),
}));
