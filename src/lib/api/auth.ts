import { fetchClient } from './client';
import { User } from './types';
import { useAuthStore } from '@/lib/store/useAuthStore';

export const authApi = {
  getMe: () => fetchClient<User>('/api/v1/auth/me'),

  logout: () => {
    const { refreshToken } = useAuthStore.getState();
    return fetchClient('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },
};
