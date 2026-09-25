/**
 * Soft-default newest-first ID sort on CM dashboard lists.
 * Apply default only when `sort` is missing so column ASC/DESC clicks stick.
 */
const DEFAULT_SORTS: Record<string, string> = {
    'api::lead.lead': 'id:DESC',
    'api::lender-master.lenders-catalog': 'id:DESC',
    'api::advisor.advisor': 'advisorId:DESC',
};

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
    // Soft default: only when sort is absent (do not overwrite column clicks)
    if (currentSort != null && String(currentSort).trim() !== '') return;

    params.set('sort', defaultSort);
    const qs = params.toString();
    const nextUrl = qs ? `${path}?${qs}` : path;

    (window as any)._doingDefaultSortReplace = true;
    try {
        history.replaceState(history.state, '', nextUrl);
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    } finally {
        setTimeout(() => {
            (window as any)._doingDefaultSortReplace = false;
        }, 0);
    }
};

/** Ensure a CM collection-types list fetch URL has a sort — default only if missing. */
export const ensureDashboardListSortUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('/content-manager/collection-types/')) return url;
    if (url.includes('/configuration') || url.includes('/configurations')) return url;

    const match = url.match(/\/content-manager\/collection-types\/(api::[^/?#]+)/);
    const uid = match?.[1];
    if (!uid) return url;
    const defaultSort = DEFAULT_SORTS[uid];
    if (!defaultSort) return url;

    // List fetches only — skip single-document GETs (.../uid/{documentId})
    const uidIdx = url.indexOf(uid);
    const afterUid = uidIdx >= 0 ? url.slice(uidIdx + uid.length) : '';
    const pathPart = afterUid.split('?')[0].split('#')[0];
    if (pathPart && pathPart !== '/') return url;

    try {
        const absolute = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        const u = new URL(absolute);
        const existing = u.searchParams.get('sort');
        if (existing != null && String(existing).trim() !== '') {
            return url;
        }
        u.searchParams.set('sort', defaultSort);
        if (url.startsWith('http')) return u.toString();
        return `${u.pathname}${u.search}${u.hash}`;
    } catch {
        return url;
    }
};
