import { fetchClient } from './client';
import { Intervention, PreventiveMaintenance, PaginatedResponse } from './types';

export const maintenanceApi = {
  // Interventions
  getInterventions: () => fetchClient<PaginatedResponse<Intervention>>('/api/v1/maintenance/interventions'),

  createIntervention: (data: Partial<Intervention>) => fetchClient<Intervention>('/api/v1/maintenance/interventions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  finishIntervention: (id: number, data: { action_taken: string; parts_used?: string; notes?: string }) =>
    fetchClient<Intervention>(`/api/v1/maintenance/interventions/${id}/finish`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  verifyIntervention: (id: number) =>
    fetchClient<Intervention>(`/api/v1/maintenance/interventions/${id}/verify`, {
      method: 'PATCH',
    }),

  getMyTasks: () => fetchClient<Intervention[]>('/api/v1/maintenance/my-tasks'),

  getQueue: () => fetchClient<Intervention[]>('/api/v1/maintenance/queue'),

  getByDay: (date: string) => fetchClient<Intervention[]>(`/api/v1/maintenance/by-day?date=${date}`),

  getMttr: () => fetchClient<any>('/api/v1/maintenance/mttr'),

  // Preventive Maintenance
  getPreventive: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<PreventiveMaintenance>>(`/api/v1/maintenance/preventive${qs ? `?${qs}` : ''}`);
  },

  createPreventive: (data: Partial<PreventiveMaintenance>) =>
    fetchClient<PreventiveMaintenance>('/api/v1/maintenance/preventive', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePreventive: (id: number, data: Partial<PreventiveMaintenance>) =>
    fetchClient<PreventiveMaintenance>(`/api/v1/maintenance/preventive/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getDuePreventive: () => fetchClient<PreventiveMaintenance[]>('/api/v1/maintenance/preventive/due'),
};
