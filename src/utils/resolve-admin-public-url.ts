import type { Core } from '@strapi/strapi';

/**
 * Public Admin origin for email CTAs (welcome / invite / forgot-password).
 * Prefers live PUBLIC_URL, then Strapi server.url, then admin.absoluteUrl.
 * Returns '' when no absolute http(s) base is available.
 */
export function resolveAdminPublicBaseUrl(strapi: Core.Strapi): string {
  const candidates = [
    process.env.PUBLIC_URL,
    strapi.config.get('server.url'),
    strapi.config.get('admin.absoluteUrl'),
  ];

  for (const raw of candidates) {
    const base = String(raw || '')
      .trim()
      .replace(/\/+$/, '');
    if (base && /^https?:\/\//i.test(base)) {
      return base;
    }
  }

  return '';
}

export function buildAdminLoginUrl(strapi: Core.Strapi): string {
  const base = resolveAdminPublicBaseUrl(strapi);
  return base ? `${base}/auth/login` : '';
}

export function buildAdminRegisterUrl(
  strapi: Core.Strapi,
  registrationToken: string
): string {
  const base = resolveAdminPublicBaseUrl(strapi);
  const token = String(registrationToken || '').trim();
  if (!base || !token) return '';
  return `${base}/auth/register?registrationToken=${encodeURIComponent(token)}`;
}

export function buildAdminResetPasswordUrl(
  strapi: Core.Strapi,
  resetCode: string
): string {
  const base = resolveAdminPublicBaseUrl(strapi);
  const code = String(resetCode || '').trim();
  if (!base || !code) return '';
  return `${base}/auth/reset-password?code=${encodeURIComponent(code)}`;
}

/** True when host looks like local/dev (emails would use a non-production origin). */
export function isLocalLookingAdminPublicUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === 'scalex.local' ||
      host.endsWith('.local')
    );
  } catch {
    return true;
  }
}

/** Log once at boot when production would emit local/missing email links. */
export function warnIfAdminPublicUrlMisconfigured(strapi: Core.Strapi): void {
  const base = resolveAdminPublicBaseUrl(strapi);
  const publicUrlSet = Boolean(String(process.env.PUBLIC_URL || '').trim());
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

  if (!base) {
    strapi.log.warn(
      '[email] PUBLIC_URL / server.url unset — admin email CTAs (welcome, invite, forgot-password) will be skipped until PUBLIC_URL is set'
    );
    return;
  }

  if (!isProd) return;

  if (!publicUrlSet || isLocalLookingAdminPublicUrl(base)) {
    strapi.log.warn(
      `[email] Admin public URL looks misconfigured for production (${base || 'empty'}). Set PUBLIC_URL to the production Admin origin so welcome/invite/forgot-password links are correct.`
    );
  }
}
