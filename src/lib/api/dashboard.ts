import { fetchClient } from './client';
import { MaterialsOverview } from './types';

export const dashboardApi = {
  getKpis: () => fetchClient<any>('/api/v1/dashboard/kpis'),

  getMachinesStatus: () => fetchClient<any>('/api/v1/dashboard/machines-status'),

  getShiftReport: () => fetchClient<any>('/api/v1/dashboard/shift-report'),

  getPareto: () => fetchClient<any>('/api/v1/dashboard/pareto'),

  getMaterialsOverview: () => fetchClient<MaterialsOverview>('/api/v1/dashboard/materials-overview'),
};
