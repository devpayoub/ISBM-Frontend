import { useAuthStore } from '@/lib/store/useAuthStore';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const REFRESH_ENDPOINT = '/api/v1/auth/refresh';

// Shared across concurrent 401s so a burst of requests triggers exactly one
// refresh call instead of one per request.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(REFRESH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        setAccessToken(data.access);
        return data.access as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function buildRequest(options: RequestInit, accessToken: string | null): RequestInit {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return { ...options, headers };
}

export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, logout } = useAuthStore.getState();
  let response = await fetch(endpoint, buildRequest(options, accessToken));

  // A 401 on a normal access token almost always just means it expired
  // (15 min lifetime) — silently refresh and retry once before giving up.
  // Logout must only happen when the user clicks it, or the refresh token
  // itself (7 day lifetime) is dead.
  if (response.status === 401 && endpoint !== REFRESH_ENDPOINT) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await fetch(endpoint, buildRequest(options, newAccessToken));
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      window.location.href = '/login';
    }
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
