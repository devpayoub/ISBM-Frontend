import { fetchClient } from './client';
import { ProductionEntry, PaginatedResponse } from './types';

export const productionApi = {
  getEntries: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<ProductionEntry>>(`/api/v1/production${qs ? `?${qs}` : ''}`);
  },
  
  createEntry: (data: Partial<ProductionEntry>) => fetchClient<ProductionEntry>('/api/v1/production', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateEntry: (id: number, data: Partial<ProductionEntry>) => fetchClient<ProductionEntry>(`/api/v1/production/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  validateEntry: (id: number) => fetchClient<ProductionEntry>(`/api/v1/production/${id}/validate`, {
    method: 'POST',
  }),

  bulkCreateEntries: (data: Partial<ProductionEntry>[]) => fetchClient<ProductionEntry[]>('/api/v1/production/bulk', {
    method: 'POST',
    body: JSON.stringify({ entries: data }),
  }),

  getDailySummary: (date: string) => fetchClient<any>(`/api/v1/production/daily-summary?date=${date}`),
  
  getShiftSummary: (date: string, shift: string) => fetchClient<any>(`/api/v1/production/shift-summary?date=${date}&shift=${shift}`),
};
