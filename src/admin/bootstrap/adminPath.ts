const MARKERS = ['/content-manager/', '/auth/', '/settings/', '/plugins/'];

/** Admin panel base, same value Strapi bakes in as ADMIN_PATH. Never a fixed host path. */
export function adminPath(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fromEnv = String((process.env as { ADMIN_PATH?: string }).ADMIN_PATH ?? '')
        .replace(origin, '')
        .replace(/\/$/, '');
    if (fromEnv.startsWith('/')) return fromEnv;

    if (typeof window === 'undefined') return '/admin';
    const path = window.location.pathname;
    for (const marker of MARKERS) {
        const index = path.indexOf(marker);
        if (index > 0) return path.slice(0, index);
    }
    return path.replace(/\/$/, '') || '/admin';
}

/** Match `window.location.pathname` against a suffix under the admin base. */
export function matchAdminPath(suffix: string): RegExpMatchArray | null {
    if (typeof window === 'undefined') return null;
    const base = adminPath().replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return window.location.pathname.match(new RegExp(`${base}${suffix}`));
}

/** Join a path onto the admin base. A leading `/admin` is replaced by that base. */
export function adminUrl(path: string): string {
    const base = adminPath().replace(/\/$/, '');
    let suffix = path.startsWith('/') ? path : `/${path}`;
    if (suffix === '/admin') return base || '/admin';
    if (suffix.startsWith('/admin/')) suffix = suffix.slice('/admin'.length);
    return `${base}${suffix}`;
}
