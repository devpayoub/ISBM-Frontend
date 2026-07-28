import { fetchClient } from './client';
import { ActivityLog, PaginatedResponse } from './types';

export const auditApi = {
  getActivityLog: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return fetchClient<PaginatedResponse<ActivityLog>>(`/api/v1/audit/logs${qs ? `?${qs}` : ''}`);
  },
};
