/**
 * Resolve the public Next.js frontend base URL for admin deep-links (e.g. AI Match → /lenders).
 * Local dev: Strapi admin :1337 → frontend :3000. Production: same origin (e.g. scalex.local).
 */
export function getFrontendBaseUrl(): string {
  const injected = (import.meta as ImportMeta & { env?: { SCALEX_FRONTEND_URL?: string } }).env
    ?.SCALEX_FRONTEND_URL;
  if (injected && injected.trim()) {
    return injected.trim().replace(/\/$/, '');
  }

  const { protocol, hostname, port, origin } = window.location;
  // Strapi admin dev server — Next.js runs on 3000
  if (port === '1337') {
    return `${protocol}//${hostname}:3000`;
  }
  return origin;
}

export function lendersPageUrl(leadId: string, source = 'ai-match'): string {
  const base = getFrontendBaseUrl();
  const params = new URLSearchParams({ leadId, source });
  return `${base}/lenders?${params.toString()}`;
}
