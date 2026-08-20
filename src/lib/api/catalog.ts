import { fetchClient } from './client';
import { BottleCapacity, BottleCharacteristic, PaginatedResponse } from './types';

export const catalogApi = {
  getCharacteristics: () => fetchClient<PaginatedResponse<BottleCharacteristic>>('/api/v1/catalog/bottle-characteristics?is_active=true'),

  getCapacity: () => fetchClient<BottleCapacity[]>('/api/v1/catalog/bottle-characteristics/capacity'),

  createCharacteristic: (data: Partial<BottleCharacteristic>) =>
    fetchClient<BottleCharacteristic>('/api/v1/catalog/bottle-characteristics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCharacteristic: (id: number, data: Partial<BottleCharacteristic>) =>
    fetchClient<BottleCharacteristic>(`/api/v1/catalog/bottle-characteristics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveCharacteristic: (id: number) =>
    fetchClient<void>(`/api/v1/catalog/bottle-characteristics/${id}`, { method: 'DELETE' }),
};
