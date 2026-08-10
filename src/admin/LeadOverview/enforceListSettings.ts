/** Soft default sorts for CM collection lists (only when URL has no sort yet). */
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
    // Soft: preserve any user- or column-chosen sort already in the URL
    if (currentSort) return;

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
