import { fetchClient } from './client';
import { ProductionPlan, PaginatedResponse, PlanningOrder, ScheduledOrder } from './types';

export const planningApi = {
  getPlanning: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<ProductionPlan>>(`/api/v1/planning${qs ? `?${qs}` : ''}`);
  },
  
  createPlan: (data: Partial<ProductionPlan>) => fetchClient<ProductionPlan>('/api/v1/planning', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updatePlan: (id: number, data: Partial<ProductionPlan>) => fetchClient<ProductionPlan>(`/api/v1/planning/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deletePlan: (id: number) => fetchClient<void>(`/api/v1/planning/${id}`, {
    method: 'DELETE',
  }),

  getTodayPlan: () => fetchClient<any>('/api/v1/planning/today'),

  getVarianceReport: (date: string) => fetchClient<any>(`/api/v1/planning/variance-report?date=${date}`),

  // ── Planning orders / queue (Phase 8) ──
  getOrders: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<PlanningOrder>>(`/api/v1/planning/orders${qs ? `?${qs}` : ''}`);
  },

  createOrder: (data: Partial<PlanningOrder>) => fetchClient<PlanningOrder>('/api/v1/planning/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateOrder: (id: number, data: Partial<PlanningOrder>) => fetchClient<PlanningOrder>(`/api/v1/planning/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteOrder: (id: number) => fetchClient<void>(`/api/v1/planning/orders/${id}`, {
    method: 'DELETE',
  }),

  getSchedule: (machineId?: number) => {
    const qs = machineId ? `?machine=${machineId}` : '';
    return fetchClient<ScheduledOrder[]>(`/api/v1/planning/orders/schedule${qs}`);
  },
};
