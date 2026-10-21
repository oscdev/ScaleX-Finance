/** Public site admin base. Next inlines ADMIN_PATH as NEXT_PUBLIC_ADMIN_PATH. Default /admin. */
export function publicAdminPath(): string {
  const raw = String(process.env.NEXT_PUBLIC_ADMIN_PATH || '/admin')
    .trim()
    .replace(/\/$/, '');
  if (!raw || raw === '/') return '/admin';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function publicAdminUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${publicAdminPath()}${suffix}`;
}

/** Rewrite a stored `/admin/...` link onto the configured admin path. */
export function withPublicAdminPath(link: string): string {
  if (link === '/admin') return publicAdminPath();
  if (link.startsWith('/admin/')) return publicAdminUrl(link.slice('/admin'.length));
  return link;
}
