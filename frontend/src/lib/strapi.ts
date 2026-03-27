export function getStrapiInternalUrl() {
  return process.env.STRAPI_INTERNAL_URL || 'http://127.0.0.1:1337';
}

export function getStrapiPublicUrl() {
  // Browser-safe base URL. If empty, callers should use relative URLs (same-origin).
  return process.env.NEXT_PUBLIC_STRAPI_PUBLIC_URL || '';
}

export function strapiPublicApi(pathnameAndQuery: string) {
  const p = pathnameAndQuery.startsWith('/') ? pathnameAndQuery : `/${pathnameAndQuery}`;
  const base = getStrapiPublicUrl();
  return base ? `${base}${p}` : p;
}

export function strapiInternalApi(pathnameAndQuery: string) {
  const p = pathnameAndQuery.startsWith('/') ? pathnameAndQuery : `/${pathnameAndQuery}`;
  return `${getStrapiInternalUrl()}${p}`;
}

export function withStrapiPublicUrl(pathOrUrl: string) {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = getStrapiPublicUrl();
  if (!base) return pathOrUrl;
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

