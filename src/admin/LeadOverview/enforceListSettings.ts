/**
 * Force newest-first ID sort on CM dashboard lists for every role
 * (Admin / Advisor / Staff / Banker). Soft mode was not enough — saved URL
 * sorts (e.g. createdAt:ASC / id:ASC) left oldest leads on top.
 */
const DEFAULT_SORTS: Record<string, string> = {
    'api::lead.lead': 'id:DESC',
    'api::lender-master.lenders-catalog': 'id:DESC',
    'api::advisor.advisor': 'advisorId:DESC',
};

const normalizeSort = (s: string | null | undefined): string =>
    decodeURIComponent(String(s || ''))
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

export const enforceDefaultListSettings = () => {
    if ((window as any)._doingDefaultSortReplace) return;

    const path = window.location.pathname;
    if (!path.includes('/content-manager/collection-types/') || path.includes('/configurations')) {
        return;
    }

    const match = path.match(/\/content-manager\/collection-types\/(api::[^/]+)(?:\/([^/?#]+))?/);
    const uid = match?.[1];
    const docSegment = match?.[2];
    // List views only — skip edit / create / clone
    if (!uid || docSegment) return;

    const defaultSort = DEFAULT_SORTS[uid];
    if (!defaultSort) return;

    const params = new URLSearchParams(window.location.search);
    const currentSort = params.get('sort');
    // Hard force: always newest ID first (ignore stale URL / Configure View sorts)
    if (normalizeSort(currentSort) === normalizeSort(defaultSort)) return;

    params.set('sort', defaultSort);
    const qs = params.toString();
    const nextUrl = qs ? `${path}?${qs}` : path;

    (window as any)._doingDefaultSortReplace = true;
    try {
        history.replaceState(history.state, '', nextUrl);
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    } finally {
        // Clear on next tick so nested history wrappers settle first
        setTimeout(() => {
            (window as any)._doingDefaultSortReplace = false;
        }, 0);
    }
};

/** Ensure a CM collection-types list fetch URL uses the forced ID DESC sort. */
export const ensureDashboardListSortUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('/content-manager/collection-types/')) return url;
    if (url.includes('/configuration') || url.includes('/configurations')) return url;

    const match = url.match(/\/content-manager\/collection-types\/(api::[^/?#]+)/);
    const uid = match?.[1];
    if (!uid) return url;
    const defaultSort = DEFAULT_SORTS[uid];
    if (!defaultSort) return url;

    try {
        const absolute = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        const u = new URL(absolute);
        if (normalizeSort(u.searchParams.get('sort')) === normalizeSort(defaultSort)) {
            return url;
        }
        u.searchParams.set('sort', defaultSort);
        if (url.startsWith('http')) return u.toString();
        return `${u.pathname}${u.search}${u.hash}`;
    } catch {
        return url;
    }
};
