/**
 * Safe fetch/parse helpers for public frontend forms.
 * Success paths behave like normal fetch + json(); fail paths avoid cryptic parse crashes
 * and avoid showing raw/internal error text to users.
 */

export const DEFAULT_USER_ERROR =
  'An unexpected error occurred. Please try again later.';

/** Parse JSON without throwing on HTML/proxy bodies. */
export async function parseJsonSafe<T = unknown>(
  res: Response
): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<{ res: Response; data: T | null }> {
  const res = await fetch(url, init);
  const data = await parseJsonSafe<T>(res);
  return { res, data };
}

/**
 * Map unknown errors to a short user-facing string.
 * Keeps intentional short API/validation messages; replaces leaky/long/network noise.
 */
export function userFacingError(
  err: unknown,
  fallback: string = DEFAULT_USER_ERROR
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : '';
  if (!raw) return fallback;
  if (raw.length > 200 || raw.includes('\n')) return fallback;
  if (/^\s*at\s+\S+/m.test(raw)) return fallback;
  if (/Python exited|stderr|ECONNREFUSED|ENOTFOUND|Unexpected token/i.test(raw)) {
    return fallback;
  }
  return raw;
}
