import { fetchClient } from './client';
import { Notification, PaginatedResponse } from './types';

export const notificationsApi = {
  getMine: () => fetchClient<PaginatedResponse<Notification>>('/api/v1/notifications'),

  getUnreadCount: () => fetchClient<{ count: number }>('/api/v1/notifications/unread_count'),

  markRead: (id: number) => fetchClient<Notification>(`/api/v1/notifications/${id}/mark_read`, {
    method: 'PATCH',
  }),

  markAllRead: () => fetchClient<{ status: string }>('/api/v1/notifications/mark_all_read', {
    method: 'POST',
  }),
};
