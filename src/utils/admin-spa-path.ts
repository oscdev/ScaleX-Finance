import type { Core } from '@strapi/strapi';

/**
 * Admin SPA path from live Strapi config (`admin.path` / `admin.url`).
 * Not the Admin API prefix (`/admin`), which Strapi keeps fixed for backend routes.
 */
export function getAdminSpaPath(strapi: Core.Strapi): string {
  const raw = String(
    strapi.config.get('admin.path') || strapi.config.get('admin.url') || '/admin'
  )
    .trim()
    .replace(/\/+$/, '');

  if (!raw) return '/admin';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/**
 * Log once at boot: resolved SPA path, and warn if ADMIN_PATH is missing
 * (config falls back to `/admin`). Production must set ADMIN_PATH to the custom SPA path.
 */
export function warnIfAdminSpaPathMisconfigured(strapi: Core.Strapi): void {
  const spa = getAdminSpaPath(strapi);
  const envSet = Boolean(String(process.env.ADMIN_PATH || '').trim());
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

  strapi.log.info(`[admin] SPA path: ${spa} (Admin APIs remain under /admin)`);

  if (!envSet) {
    strapi.log.warn(
      '[admin] ADMIN_PATH unset — Admin SPA falls back to /admin. Set ADMIN_PATH in .env (no trailing slash), then rebuild Admin and restart Strapi.'
    );
  }

  if (isProd && spa === '/admin') {
    strapi.log.warn(
      '[admin] Production Admin SPA is still /admin. Set ADMIN_PATH to your custom panel path (e.g. /FinanCe-21x08k19G), rebuild Admin, and restart.'
    );
  }
}

/** Rewrite legacy Header Advisor Login links that still point at /admin/auth/login. */
export function resolveAdvisorLoginLink(
  strapi: Core.Strapi,
  stored: string | null | undefined
): string {
  const spa = getAdminSpaPath(strapi);
  const fallback = `${spa}/auth/login`;
  const value = String(stored || '').trim();
  if (!value || value === '/admin/auth/login' || value === 'admin/auth/login') {
    return fallback;
  }
  return value;
}
