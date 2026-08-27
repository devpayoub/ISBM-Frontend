import { fetchClient } from './client';
import {
  AuxiliaryEquipment, Machine, MachineComponent, MachineParameter, MachineStatus, Mold,
  PaginatedResponse, Parameter,
} from './types';

export const machinesApi = {
  getMachines: () => fetchClient<PaginatedResponse<Machine>>('/api/v1/machines'),

  getMachineDetails: (id: number) => fetchClient<Machine>(`/api/v1/machines/${id}`),

  getMine: () => fetchClient<Machine[]>('/api/v1/machines/mine'),

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

  // ── Generic key/value settings (Parameter model — includes STEG rows) ──
  getAllParameters: (params?: { category?: string; is_active?: boolean }) => {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return fetchClient<PaginatedResponse<Parameter>>(`/api/v1/machines/parameters${qs ? `?${qs}` : ''}`);
  },

  updateParameter: (id: number, data: Partial<Parameter>) => fetchClient<Parameter>(`/api/v1/machines/parameters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Convenience wrapper — STEG (Phase 1): STEG_ENABLED/STEG_TIME/STEG_DATA, category="steg".
  getSteg: () => fetchClient<PaginatedResponse<Parameter>>('/api/v1/machines/parameters?category=steg'),

  // ── Machine equipment (Phase 2: components / auxiliary equipment / molds) ──
  getComponents: (machineId?: number) => {
    const qs = machineId ? `?machine=${machineId}` : '';
    return fetchClient<PaginatedResponse<MachineComponent>>(`/api/v1/machines/components${qs}`);
  },
  createComponent: (data: Partial<MachineComponent>) => fetchClient<MachineComponent>('/api/v1/machines/components', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateComponent: (id: number, data: Partial<MachineComponent>) => fetchClient<MachineComponent>(`/api/v1/machines/components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteComponent: (id: number) => fetchClient<void>(`/api/v1/machines/components/${id}`, { method: 'DELETE' }),

  // ── Machine parameters (Fiche Technique readings) ──
  getMachineParameters: (params: { machine?: number; component?: number }) => {
    const qs = new URLSearchParams();
    if (params.machine) qs.set('machine', String(params.machine));
    if (params.component) qs.set('component', String(params.component));
    return fetchClient<PaginatedResponse<MachineParameter>>(`/api/v1/machines/parameter-readings?${qs.toString()}`);
  },
  createMachineParameter: (data: Partial<MachineParameter>) => fetchClient<MachineParameter>('/api/v1/machines/parameter-readings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMachineParameter: (id: number, data: Partial<MachineParameter>) => fetchClient<MachineParameter>(`/api/v1/machines/parameter-readings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteMachineParameter: (id: number) => fetchClient<void>(`/api/v1/machines/parameter-readings/${id}`, { method: 'DELETE' }),

  getAuxiliaryEquipment: () => fetchClient<PaginatedResponse<AuxiliaryEquipment>>('/api/v1/machines/auxiliary-equipment'),
  createAuxiliaryEquipment: (data: Partial<AuxiliaryEquipment>) => fetchClient<AuxiliaryEquipment>('/api/v1/machines/auxiliary-equipment', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateAuxiliaryEquipment: (id: number, data: Partial<AuxiliaryEquipment>) => fetchClient<AuxiliaryEquipment>(`/api/v1/machines/auxiliary-equipment/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteAuxiliaryEquipment: (id: number) => fetchClient<void>(`/api/v1/machines/auxiliary-equipment/${id}`, { method: 'DELETE' }),

  getMolds: (machineId?: number) => {
    const qs = machineId ? `?machine=${machineId}` : '';
    return fetchClient<PaginatedResponse<Mold>>(`/api/v1/machines/molds${qs}`);
  },
  createMold: (data: Partial<Mold>) => fetchClient<Mold>('/api/v1/machines/molds', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMold: (id: number, data: Partial<Mold>) => fetchClient<Mold>(`/api/v1/machines/molds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteMold: (id: number) => fetchClient<void>(`/api/v1/machines/molds/${id}`, { method: 'DELETE' }),
};
