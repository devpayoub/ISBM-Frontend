import { fetchClient } from './client';
import { Package, PackageSummary, PaginatedResponse, PersonnelSnapshotEntry } from './types';

export const packageApi = {
  getPackages: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<Package>>(`/api/v1/package/packages${qs ? `?${qs}` : ''}`);
  },

  getSummary: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PackageSummary>(`/api/v1/package/packages/summary${qs ? `?${qs}` : ''}`);
  },

  ship: (id: number, shippedTo: string) => fetchClient<Package>(`/api/v1/package/packages/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify({ shipped_to: shippedTo }),
  }),

  createPackage: (data: Partial<Package>) => fetchClient<Package>('/api/v1/package/packages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updatePackage: (id: number, data: Partial<Package>) => fetchClient<Package>(`/api/v1/package/packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  resolvePersonnelPreview: (machineId: number, start: string, end?: string) => {
    const params = new URLSearchParams({ machine: String(machineId), start, ...(end ? { end } : {}) });
    return fetchClient<PersonnelSnapshotEntry[]>(`/api/v1/package/packages/resolve-personnel?${params.toString()}`);
  },
};
