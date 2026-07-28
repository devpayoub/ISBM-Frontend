import { fetchClient } from './client';
import { OEERecord, PaginatedResponse } from './types';

export const oeeApi = {
  getOeeHistory: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<OEERecord>>(`/api/v1/oee${qs ? `?${qs}` : ''}`);
  },
  
  getCurrentOee: () => fetchClient<any>('/api/v1/oee/current'),
  
  getMachineOee: (machineId: number) => fetchClient<OEERecord>(`/api/v1/oee/${machineId}/detail`),
  
  getOeeTrends: () => fetchClient<any>('/api/v1/oee/trends'),
  
  recalculateOee: (machineId: number, date: string, shift: string) => fetchClient<any>('/api/v1/oee/recalc', {
    method: 'POST',
    body: JSON.stringify({ machine: machineId, date, shift }),
  }),
};
