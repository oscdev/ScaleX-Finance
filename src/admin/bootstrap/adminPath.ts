const MARKERS = ['/content-manager/', '/auth/', '/settings/', '/plugins/'];

/**
 * Admin SPA basename from Strapi build (`ADMIN_PATH` ← config/admin.ts `url`).
 * Use for browser navigations / pathname matchers only — not for REST fetches.
 */
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

/** Match `window.location.pathname` against a suffix under the SPA base. */
export function matchAdminPath(suffix: string): RegExpMatchArray | null {
    if (typeof window === 'undefined') return null;
    const base = adminPath().replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return window.location.pathname.match(new RegExp(`${base}${suffix}`));
}

/**
 * SPA / browser route under the admin panel base.
 * A leading `/admin` is rewritten onto that base.
 */
export function adminUrl(path: string): string {
    const base = adminPath().replace(/\/$/, '');
    let suffix = path.startsWith('/') ? path : `/${path}`;
    if (suffix === '/admin') return base || '/admin';
    if (suffix.startsWith('/admin/')) suffix = suffix.slice('/admin'.length);
    return `${base}${suffix}`;
}

/**
 * Backend admin API URL. Strapi always mounts admin REST under `/admin`
 * (ScaleX custom admin routes are registered there too) — not under the SPA path.
 */
export function adminApiUrl(path: string): string {
    let suffix = path.startsWith('/') ? path : `/${path}`;
    if (suffix === '/admin' || suffix.startsWith('/admin/')) return suffix;
    return `/admin${suffix}`;
}
