import { fetchClient } from './client';
import { NonConformity, AuditDocument, PaginatedResponse } from './types';

export const qualityApi = {
  // Non-Conformities
  getNonConformities: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<NonConformity>>(`/api/v1/quality/nc/${qs ? `?${qs}` : ''}`);
  },

  getNcDetails: (id: number) => fetchClient<NonConformity>(`/api/v1/quality/nc/${id}/`),

  createNc: (data: Partial<NonConformity>) => fetchClient<NonConformity>('/api/v1/quality/nc/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateNc: (id: number, data: Partial<NonConformity>) => fetchClient<NonConformity>(`/api/v1/quality/nc/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  closeNc: (id: number) => fetchClient<NonConformity>(`/api/v1/quality/nc/${id}/close/`, {
    method: 'PATCH',
  }),

  deleteNc: (id: number) => fetchClient<void>(`/api/v1/quality/nc/${id}/`, {
    method: 'DELETE',
  }),

  getOpenNcs: () => fetchClient<NonConformity[]>('/api/v1/quality/nc/open/'),
  getNcsByClause: () => fetchClient<any>('/api/v1/quality/nc/by-clause/'),

  // Audit Documents
  getAuditDocs: () => fetchClient<PaginatedResponse<AuditDocument>>('/api/v1/quality/audit/'),
  
  getAuditDoc: (id: number) => fetchClient<AuditDocument>(`/api/v1/quality/audit/${id}/`),

  createAuditDoc: (data: FormData) => fetchClient<AuditDocument>('/api/v1/quality/audit/', {
    method: 'POST',
    body: data,
    headers: {}, // Let browser set content-type for FormData
  }),

  deleteAuditDoc: (id: number) => fetchClient<void>(`/api/v1/quality/audit/${id}/`, {
    method: 'DELETE',
  }),
};
