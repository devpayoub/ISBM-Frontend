import { fetchClient } from './client';
import { PaginatedResponse, StockItem, StockItemType, StockMovementType } from './types';

export const stockApi = {
  getItems: (params?: { type?: StockItemType; is_active?: string; search?: string }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchClient<PaginatedResponse<StockItem>>(`/api/v1/stock/items${qs ? `?${qs}` : ''}`);
  },

  getItem: (id: number) => fetchClient<StockItem>(`/api/v1/stock/items/${id}`),

  createItem: (data: Partial<StockItem>) => fetchClient<StockItem>('/api/v1/stock/items', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateItem: (id: number, data: Partial<StockItem>) => fetchClient<StockItem>(`/api/v1/stock/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  archiveItem: (id: number) => fetchClient<void>(`/api/v1/stock/items/${id}`, { method: 'DELETE' }),

  move: (id: number, data: { type: StockMovementType; delta: string; reason?: string }) =>
    fetchClient<StockItem>(`/api/v1/stock/items/${id}/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLowStock: () => fetchClient<StockItem[]>('/api/v1/stock/items/low-stock'),
};
