import { fetchClient } from './client';
import {
  ChecklistTemplate, ControlResultStatus, Intervention, MaintenanceControl,
  PreventiveMaintenance, PaginatedResponse,
} from './types';

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

  // Controller Control page (preventive maintenance checklists)
  getChecklistTemplates: () => fetchClient<PaginatedResponse<ChecklistTemplate>>('/api/v1/maintenance/checklist-templates'),

  getControls: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<MaintenanceControl>>(`/api/v1/maintenance/controls${qs ? `?${qs}` : ''}`);
  },

  getControl: (id: number) => fetchClient<MaintenanceControl>(`/api/v1/maintenance/controls/${id}`),

  startControl: (data: { machine?: number; equipment?: number; date: string; shift: string }) =>
    fetchClient<MaintenanceControl>('/api/v1/maintenance/controls/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submitControlResults: (id: number, results: { item: number; status: ControlResultStatus; note?: string }[]) =>
    fetchClient<MaintenanceControl>(`/api/v1/maintenance/controls/${id}/results`, {
      method: 'PATCH',
      body: JSON.stringify({ results }),
    }),

  confirmControl: (id: number) =>
    fetchClient<MaintenanceControl>(`/api/v1/maintenance/controls/${id}/confirm`, {
      method: 'PATCH',
    }),
};
