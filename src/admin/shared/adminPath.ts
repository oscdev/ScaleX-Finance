/**
 * Dynamic Admin SPA basename from Strapi build env (`config/admin.ts` → `admin.path` → `ADMIN_PATH`).
 * Admin APIs remain under `/admin` — do not use these helpers for fetch() API URLs.
 */

export function getAdminBasename(): string {
  const raw = String(process.env.ADMIN_PATH ?? '')
    .replace(typeof window !== 'undefined' ? window.location.origin : '', '')
    .replace(/\/+$/, '');

  if (!raw && typeof window !== 'undefined') {
    const m = window.location.pathname.match(
      /^(\/[^/]+)(?=\/(?:auth|content-manager|settings|plugins|marketplace|me)(?:\/|$)|\/?$)/
    );
    if (m?.[1]) return m[1];
  }

  return raw || '/admin';
}

/** Build an Admin SPA URL under the current basename (e.g. content-manager/...). */
export function adminAppUrl(subPath = ''): string {
  const base = getAdminBasename();
  const rest = String(subPath || '').replace(/^\/+/, '');
  return rest ? `${base}/${rest}` : base;
}
