import { fetchClient } from './client';
import { Machine, Parameter, MachineStatus, PaginatedResponse } from './types';

export const machinesApi = {
  getMachines: () => fetchClient<PaginatedResponse<Machine>>('/api/v1/machines'),
  
  getMachineDetails: (id: number) => fetchClient<Machine>(`/api/v1/machines/${id}`),
  
  createMachine: (data: Partial<Machine>) => fetchClient<Machine>('/api/v1/machines', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateMachine: (id: number, data: Partial<Machine>) => fetchClient<Machine>(`/api/v1/machines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteMachine: (id: number) => fetchClient<void>(`/api/v1/machines/${id}`, {
    method: 'DELETE',
  }),

  updateStatus: (id: number, status: MachineStatus) => fetchClient<Machine>(`/api/v1/machines/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  
  getParameters: (id: number) => fetchClient<PaginatedResponse<Parameter>>(`/api/v1/machines/${id}/parameters`),
};
