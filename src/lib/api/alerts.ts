import { fetchClient } from './client';
import { Alert, AlertCategory, AlertComment, PaginatedResponse } from './types';

export const alertsApi = {
  getAlerts: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<Alert>>(`/api/v1/alerts${qs ? `?${qs}` : ''}`);
  },
  
  getActiveAlerts: () => fetchClient<Alert[]>('/api/v1/alerts/active'),
  
  getAlertDetails: (id: number) => fetchClient<Alert>(`/api/v1/alerts/${id}`),
  
  createAlert: (data: Partial<Alert>) => fetchClient<Alert>('/api/v1/alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  acknowledgeAlert: (id: number) => fetchClient<Alert>(`/api/v1/alerts/${id}/acknowledge`, {
    method: 'PATCH',
  }),

  startAlert: (id: number) => fetchClient<Alert>(`/api/v1/alerts/${id}/start`, {
    method: 'PATCH',
  }),
  
  resolveAlert: (id: number, data?: { downtime_min?: number; bottles_lost?: number; resolution_notes?: string }) => 
    fetchClient<Alert>(`/api/v1/alerts/${id}/resolve`, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  closeAlert: (id: number) => fetchClient<Alert>(`/api/v1/alerts/${id}/close`, {
    method: 'PATCH',
  }),
  
  escalateAlert: (id: number) => fetchClient<Alert>(`/api/v1/alerts/${id}/escalate`, {
    method: 'PATCH',
  }),
  
  addComment: (id: number, content: string) => fetchClient<AlertComment>(`/api/v1/alerts/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  
  getCategories: () => fetchClient<PaginatedResponse<AlertCategory>>('/api/v1/alerts/categories'),

  createCategory: (data: Partial<AlertCategory>) => fetchClient<AlertCategory>('/api/v1/alerts/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateCategory: (id: number, data: Partial<AlertCategory>) => fetchClient<AlertCategory>(`/api/v1/alerts/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteCategory: (id: number) => fetchClient<void>(`/api/v1/alerts/categories/${id}`, {
    method: 'DELETE',
  }),

  getPareto: () => fetchClient<any>('/api/v1/alerts/pareto'),
  getStats: () => fetchClient<any>('/api/v1/alerts/stats'),
};
