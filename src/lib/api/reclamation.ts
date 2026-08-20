import { fetchClient } from './client';
import { PaginatedResponse, Reclamation, ResolvedPersonnel } from './types';

export const reclamationApi = {
  getReclamations: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<Reclamation>>(`/api/v1/reclamation/reclamations${qs ? `?${qs}` : ''}`);
  },

  getReclamation: (id: number) => fetchClient<Reclamation>(`/api/v1/reclamation/reclamations/${id}`),

  createReclamation: (data: Partial<Reclamation>) => fetchClient<Reclamation>('/api/v1/reclamation/reclamations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateReclamation: (id: number, data: Partial<Reclamation>) => fetchClient<Reclamation>(`/api/v1/reclamation/reclamations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  closeReclamation: (id: number, resolution: string) => fetchClient<Reclamation>(`/api/v1/reclamation/reclamations/${id}/close`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution }),
  }),

  resolvePersonnelPreview: (when: string, machineId?: number) => {
    const params = new URLSearchParams({ when, ...(machineId ? { machine: String(machineId) } : {}) });
    return fetchClient<ResolvedPersonnel>(`/api/v1/reclamation/reclamations/resolve-personnel?${params.toString()}`);
  },
};
