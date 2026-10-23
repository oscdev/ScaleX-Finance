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
