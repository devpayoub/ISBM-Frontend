import { create } from 'zustand';
import { Alert } from '@/lib/api/types';

interface AlertStore {
  liveAlerts: Alert[];
  machineStatus: Record<number, string>; // machineId -> 'GREEN' | 'ORANGE' | 'RED'
  isConnected: boolean;
  
  setConnected: (status: boolean) => void;
  
  // Alert actions
  addOrUpdateAlert: (alert: Alert) => void;
  removeAlert: (alertId: number) => void;
  setInitialAlerts: (alerts: Alert[]) => void;
  
  // Andon actions
  updateMachineStatus: (machineId: number, status: string) => void;
  setInitialMachineStatus: (statusRecord: Record<number, string>) => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  liveAlerts: [],
  machineStatus: {},
  isConnected: false,

  setConnected: (status) => set({ isConnected: status }),

  addOrUpdateAlert: (alert) => set((state) => {
    const exists = state.liveAlerts.find(a => a.id === alert.id);
    if (exists) {
      return { liveAlerts: state.liveAlerts.map(a => a.id === alert.id ? alert : a) };
    }
    return { liveAlerts: [alert, ...state.liveAlerts] };
  }),

  removeAlert: (alertId) => set((state) => ({
    liveAlerts: state.liveAlerts.filter(a => a.id !== alertId)
  })),

  setInitialAlerts: (alerts) => set({ liveAlerts: alerts }),

  updateMachineStatus: (machineId, status) => set((state) => ({
    machineStatus: { ...state.machineStatus, [machineId]: status }
  })),

  setInitialMachineStatus: (statusRecord) => set({ machineStatus: statusRecord })
}));
