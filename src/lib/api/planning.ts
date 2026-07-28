import { fetchClient } from './client';
import { ProductionPlan, PaginatedResponse } from './types';

export const planningApi = {
  getPlanning: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<ProductionPlan>>(`/api/v1/planning${qs ? `?${qs}` : ''}`);
  },
  
  createPlan: (data: Partial<ProductionPlan>) => fetchClient<ProductionPlan>('/api/v1/planning', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getTodayPlan: () => fetchClient<any>('/api/v1/planning/today'),
  
  getVarianceReport: (date: string) => fetchClient<any>(`/api/v1/planning/variance-report?date=${date}`),
};
