import { fetchClient } from './client';
import { CostParameter, CostRecord, PaginatedResponse } from './types';

export const costsApi = {
  getParameters: () => fetchClient<PaginatedResponse<CostParameter>>('/api/v1/costs/parameters'),
  
  updateParameters: (data: Partial<CostParameter>[]) => fetchClient<CostParameter[]>('/api/v1/costs/parameters', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  createParameter: (data: Partial<CostParameter>) => fetchClient<CostParameter>('/api/v1/costs/parameters', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteParameter: (id: number) => fetchClient<void>(`/api/v1/costs/parameters/${id}`, {
    method: 'DELETE',
  }),

  getCostRecords: () => fetchClient<PaginatedResponse<CostRecord>>('/api/v1/costs'),
  
  getDailyCosts: (date: string) => fetchClient<any>(`/api/v1/costs/daily?date=${date}`),
  
  getMonthlyReport: (year: number, month: number) => fetchClient<any>(`/api/v1/costs/monthly-report?year=${year}&month=${month}`),
  
  recalculateCosts: (date: string, shift: string) => fetchClient<any>('/api/v1/costs/recalc', {
    method: 'POST',
    body: JSON.stringify({ date, shift }),
  }),
};
