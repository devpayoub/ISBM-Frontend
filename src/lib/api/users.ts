import { fetchClient } from './client';
import { User, PaginatedResponse } from './types';

export const usersApi = {
  getUsers: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<User>>(`/api/v1/auth/users${qs ? `?${qs}` : ''}`);
  },

  getUser: (id: number) => fetchClient<User>(`/api/v1/auth/users/${id}`),

  createUser: (data: Partial<User> & { password: string }) => fetchClient<User>('/api/v1/auth/users/register', {
    method: 'POST',
    body: JSON.stringify({ ...data, password2: data.password }),
  }),

  updateUser: (id: number, data: Partial<User>) => fetchClient<User>(`/api/v1/auth/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteUser: (id: number) => fetchClient<void>(`/api/v1/auth/users/${id}`, {
    method: 'DELETE',
  }),

  getOnDuty: () => fetchClient<User[]>('/api/v1/auth/users/on-duty'),
};
