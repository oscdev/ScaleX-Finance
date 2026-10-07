import type { Core } from '@strapi/strapi';

type HeaderBag = Record<string, string | string[] | undefined>;

type RequestLike = {
  get?: (name: string) => string | undefined;
  header?: HeaderBag;
  headers?: HeaderBag;
  protocol?: string;
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function firstHeader(request: RequestLike, name: string): string {
  const fromGet = request.get?.(name);
  const bag = request.header || request.headers || {};
  const raw = fromGet ?? bag[name] ?? bag[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || '')
    .split(',')[0]
    .trim();
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return LOOPBACK_HOSTS.has(host);
}

/** DNS hostname only — no IP, userinfo, path, or empty labels. */
function isPublicHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || isLoopbackHost(hostname)) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
    hostname
  );
}

function splitHost(host: string): { hostname: string; port: string } | null {
  const raw = host.trim();
  if (!raw || raw.includes('/') || raw.includes('@') || /\s/.test(raw)) return null;

  if (raw.startsWith('[')) {
    const match = raw.match(/^\[([^\]]+)\](?::(\d+))?$/);
    if (!match) return null;
    return { hostname: match[1], port: match[2] || '' };
  }

  const colon = raw.lastIndexOf(':');
  if (colon === -1) return { hostname: raw, port: '' };
  const port = raw.slice(colon + 1);
  if (!/^\d+$/.test(port)) return null;
  return { hostname: raw.slice(0, colon), port };
}

function normalizeOrigin(proto: string, hostname: string, port: string): string {
  const scheme = proto.toLowerCase().replace(/:$/, '');
  if (scheme !== 'http' && scheme !== 'https') return '';
  if (!isPublicHostname(hostname)) return '';
  const dropPort =
    !port || (scheme === 'https' && port === '443') || (scheme === 'http' && port === '80');
  return dropPort
    ? `${scheme}://${hostname}`
    : `${scheme}://${hostname}:${port}`;
}

/**
 * Public origin of the HTTP request that triggered this email.
 * Uses X-Forwarded-Proto / X-Forwarded-Host, then Host. Skips loopback.
 */
function resolveRequestPublicOrigin(strapi: Core.Strapi): string {
  try {
    const ctx = (
      strapi as Core.Strapi & {
        requestContext?: { get?: () => { request?: RequestLike } | undefined };
      }
    ).requestContext?.get?.();
    const request = ctx?.request;
    if (!request) return '';

    const host = firstHeader(request, 'x-forwarded-host') || firstHeader(request, 'host');
    const parts = host ? splitHost(host) : null;
    if (!parts) return '';

    const forwardedProto = firstHeader(request, 'x-forwarded-proto').toLowerCase();
    const requestProto = String(request.protocol || '')
      .toLowerCase()
      .replace(/:$/, '');
    const proto =
      forwardedProto === 'http' || forwardedProto === 'https'
        ? forwardedProto
        : requestProto === 'http' || requestProto === 'https'
          ? requestProto
          : '';
    if (!proto) return '';

    return normalizeOrigin(proto, parts.hostname, parts.port);
  } catch {
    return '';
  }
}

function resolveExplicitPublicUrl(): string {
  const raw = String(process.env.PUBLIC_URL || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return normalizeOrigin(url.protocol, url.hostname, url.port);
  } catch {
    return '';
  }
}

/**
 * Public Admin origin for email CTAs (welcome / invite / forgot-password).
 * Prefers the live request host, then PUBLIC_URL when set.
 * Does not use the server.url code default. Returns '' when neither is available.
 */
export function resolveAdminPublicBaseUrl(strapi: Core.Strapi): string {
  return resolveRequestPublicOrigin(strapi) || resolveExplicitPublicUrl();
}

export function buildAdminLoginUrl(strapi: Core.Strapi): string {
  const base = resolveAdminPublicBaseUrl(strapi);
  return base ? `${base}/admin/auth/login` : '';
}

export function buildAdminRegisterUrl(
  strapi: Core.Strapi,
  registrationToken: string
): string {
  const base = resolveAdminPublicBaseUrl(strapi);
  const token = String(registrationToken || '').trim();
  if (!base || !token) return '';
  return `${base}/admin/auth/register?registrationToken=${encodeURIComponent(token)}`;
}

export function buildAdminResetPasswordUrl(
  strapi: Core.Strapi,
  resetCode: string
): string {
  const base = resolveAdminPublicBaseUrl(strapi);
  const code = String(resetCode || '').trim();
  if (!base || !code) return '';
  return `${base}/admin/auth/reset-password?code=${encodeURIComponent(code)}`;
}

/** True when host looks like local/dev (emails would use a non-production origin). */
export function isLocalLookingAdminPublicUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return true;
  }
}

/** Log once at boot when a pinned PUBLIC_URL would emit a local/missing origin. */
export function warnIfAdminPublicUrlMisconfigured(strapi: Core.Strapi): void {
  const pinned = resolveExplicitPublicUrl();
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd) return;

  if (!pinned) {
    strapi.log.warn(
      '[email] PUBLIC_URL unset — welcome, invite, and forgot-password links use the host of the request that sends the email. Set PUBLIC_URL only to pin an origin when there is no HTTP request.'
    );
    return;
  }

  if (isLocalLookingAdminPublicUrl(pinned)) {
    strapi.log.warn(
      `[email] PUBLIC_URL looks misconfigured for production (${pinned}). Set it to the production Admin origin so welcome/invite/forgot-password links stay correct when no request host is available.`
    );
  }
}
