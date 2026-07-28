import { fetchClient } from './client';

export const dashboardApi = {
  getKpis: () => fetchClient<any>('/api/v1/dashboard/kpis'),
  
  getMachinesStatus: () => fetchClient<any>('/api/v1/dashboard/machines-status'),
  
  getShiftReport: () => fetchClient<any>('/api/v1/dashboard/shift-report'),
  
  getPareto: () => fetchClient<any>('/api/v1/dashboard/pareto'),
};
