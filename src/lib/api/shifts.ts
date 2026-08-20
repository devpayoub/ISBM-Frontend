import { fetchClient } from './client';
import { PaginatedResponse, ShiftAssignment } from './types';

export const shiftsApi = {
  getAssignments: (params?: { user?: number; machine?: number; shift?: string }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchClient<PaginatedResponse<ShiftAssignment>>(`/api/v1/auth/shift-assignments${qs ? `?${qs}` : ''}`);
  },

  createAssignment: (data: Partial<ShiftAssignment>) => fetchClient<ShiftAssignment>('/api/v1/auth/shift-assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateAssignment: (id: number, data: Partial<ShiftAssignment>) => fetchClient<ShiftAssignment>(`/api/v1/auth/shift-assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteAssignment: (id: number) => fetchClient<void>(`/api/v1/auth/shift-assignments/${id}`, {
    method: 'DELETE',
  }),

  // Who was working at a given moment — the lookup Reclamation/Package
  // traceability depend on. `when` must be an ISO 8601 datetime string.
  workingAt: (when: string, opts?: { machine?: number; role?: string }) => {
    const params = new URLSearchParams({ when, ...(opts?.machine ? { machine: String(opts.machine) } : {}), ...(opts?.role ? { role: opts.role } : {}) });
    return fetchClient<ShiftAssignment[]>(`/api/v1/auth/shift-assignments/working_at?${params.toString()}`);
  },
};
