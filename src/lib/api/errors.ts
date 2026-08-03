import { ApiError } from './client';

/** DRF validation errors come back as {"field": ["message", ...]}. Flatten
 * that into {"field": "message"} for use as <Input error={...}> props. */
export function parseFieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError)) return {};
  try {
    const body = JSON.parse(e.message);
    if (!body || typeof body !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [field, value] of Object.entries(body)) {
      if (Array.isArray(value) && value.length > 0) {
        out[field] = String(value[0]);
      } else if (typeof value === 'string') {
        out[field] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** A single human-readable message out of the same error shape, for toasts. */
export function errorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  try {
    const body = JSON.parse(e.message);
    if (body?.detail) return String(body.detail);
    if (body && typeof body === 'object') {
      const first = Object.values(body)[0];
      if (Array.isArray(first) && first.length > 0) return String(first[0]);
      if (typeof first === 'string') return first;
    }
  } catch {
    // not JSON — fall through to fallback
  }
  return fallback;
}
