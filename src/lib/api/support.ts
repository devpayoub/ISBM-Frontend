import { fetchClient } from './client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  CommentRequestType, PaginatedResponse, SupplierSolution, SupportKPIs, Ticket, TicketAttachment,
  TicketAttachmentCategory, TicketComment, TicketValidationDecision,
} from './types';

export const supportApi = {
  getTickets: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<Ticket>>(`/api/v1/support/tickets${qs ? `?${qs}` : ''}`);
  },

  getTicket: (id: number) => fetchClient<Ticket>(`/api/v1/support/tickets/${id}`),

  createTicket: (data: Partial<Ticket>) => fetchClient<Ticket>('/api/v1/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  assignSupplier: (id: number) => fetchClient<Ticket>(`/api/v1/support/tickets/${id}/assign_supplier`, {
    method: 'PATCH',
  }),

  startDiagnosis: (id: number) => fetchClient<Ticket>(`/api/v1/support/tickets/${id}/start_diagnosis`, {
    method: 'PATCH',
  }),

  proposeSolution: (id: number, data: Partial<SupplierSolution>) =>
    fetchClient<Ticket>(`/api/v1/support/tickets/${id}/propose_solution`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  validate: (id: number, decision: TicketValidationDecision, reason?: string) =>
    fetchClient<Ticket>(`/api/v1/support/tickets/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reason }),
    }),

  close: (id: number, data: {
    repair_conforms?: boolean; machine_back_in_service?: boolean; restarted_at?: string;
    intervention_duration_min?: number; parts_replaced?: string;
    intervention_cost?: number;
  }) => fetchClient<Ticket>(`/api/v1/support/tickets/${id}/close`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  addComment: (id: number, text: string, requestType?: CommentRequestType) => fetchClient<TicketComment>(`/api/v1/support/tickets/${id}/add_comment`, {
    method: 'POST',
    body: JSON.stringify({ text, request_type: requestType || '' }),
  }),

  addAttachment: (id: number, file: File, category: TicketAttachmentCategory, solutionId?: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    if (solutionId) form.append('solution', String(solutionId));
    return fetchClient<TicketAttachment>(`/api/v1/support/tickets/${id}/add_attachment`, {
      method: 'POST',
      body: form,
      headers: {}, // let the browser set the multipart content-type
    });
  },

  getKpis: (days?: number) => fetchClient<SupportKPIs>(`/api/v1/support/kpis${days ? `?days=${days}` : ''}`),

  // Binary file downloads: fetchClient assumes a JSON body, so these fetch
  // directly (still attaching the JWT) and hand back a Blob for the caller
  // to trigger a download from.
  exportPdf: () => downloadFile('/api/v1/support/tickets/export_pdf'),
  exportExcel: () => downloadFile('/api/v1/support/tickets/export_excel'),
};

async function downloadFile(endpoint: string): Promise<Blob> {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(endpoint, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  return res.blob();
}
