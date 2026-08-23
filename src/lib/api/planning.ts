import { fetchClient } from './client';
import { PaginatedResponse, PlanningOrder, ScheduledOrder } from './types';

export const planningApi = {
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
