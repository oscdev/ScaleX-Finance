// This file has NO exports and NO functions — every line runs at module evaluation
// time, which happens before Strapi's React app renders its first frame.

// Set body class synchronously so the CSS rule below takes effect before React
// renders the first frame — this is what prevents the Preview aside from flashing.
const setAdvisorEditClass = () => {
    const isAdvisorEdit = /api::advisor\.advisor\/[^/]+/.test(window.location.pathname);
    document.body.classList.toggle('advisor-edit-page', isAdvisorEdit);
};
setAdvisorEditClass();

// ── Collection list page-size sync ───────────────────────────────────────────
// React Router wraps history.pushState AFTER this file runs, making it the
// outermost handler. That means it reads the URL *before* our pushState wrapper
// can modify it — so pre-modifying the URL in pushState does not work.
//
// Instead we use a post-navigation fix: after React Router has settled its state
// (via setTimeout), we call history.replaceState to update the URL to the
// configured pageSize and then dispatch a 'popstate' event.  React Router listens
// to popstate and re-reads the URL, causing every useSearchParams / useQueryParams
// consumer (including the "Entries per page" dropdown) to update.
//
// _configuredPageSizes is a map of collection UID → configured pageSize,
// populated by fetchInterceptor.ts as each collection's configuration GET arrives.
let _doingPageSizeReplace = false;

const _getCollectionUid = (href: string): string | null => {
    const m = href.match(/collection-types\/(api::[^/?#]+)/);
    return m ? m[1] : null;
};

const _fixCollectionPageSize = () => {
    const uid = _getCollectionUid(window.location.href);
    if (!uid) return;
    const pageSizes = (window as any)._configuredPageSizes as Record<string, number> | undefined;
    const configPageSize = pageSizes?.[uid];
    if (!configPageSize) return;
    try {
        const urlObj = new URL(window.location.href);
        const urlPageSize = Number(urlObj.searchParams.get('pageSize') || '0');
        if (urlPageSize === configPageSize) return;
        urlObj.searchParams.set('pageSize', String(configPageSize));
        urlObj.searchParams.set('page', '1');
        _doingPageSizeReplace = true;
        history.replaceState(history.state, '', urlObj.pathname + urlObj.search + urlObj.hash);
        _doingPageSizeReplace = false;
        // Notify React Router so it re-reads the URL and updates all components
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    } catch { _doingPageSizeReplace = false; }
};
(window as any)._fixCollectionPageSize = _fixCollectionPageSize;

// Re-sync the class on every SPA navigation (history.pushState / replaceState).
// We wrap here — before patchHistoryMethods in domOverrides — so the class is
// always current by the time React starts rendering the new route.
const _origEarlyPush = history.pushState.bind(history);
const _origEarlyReplace = history.replaceState.bind(history);
history.pushState = function (data: any, unused: string, url?: string | URL | null) {
    const r = _origEarlyPush(data, unused, url);
    setAdvisorEditClass();
    // Schedule page-size fix after React Router has processed this navigation
    const urlStr = typeof url === 'string' ? url : (url as any)?.toString?.() ?? '';
    if (urlStr.includes('collection-types/api::')) {
        setTimeout(_fixCollectionPageSize, 80);
    }
    return r;
};
history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
    // Guard: skip when we're the ones doing the replacement (avoid infinite loop)
    if (_doingPageSizeReplace) { _origEarlyReplace(data, unused, url); return; }
    const r = _origEarlyReplace(data, unused, url);
    setAdvisorEditClass();
    return r;
};
window.addEventListener('popstate', setAdvisorEditClass);

const style = document.createElement('style');
style.id = 'scalex-early-css';
style.textContent = `
    /* Strip numbered list markers from sidebar before React renders */
    nav li, nav ol, nav ul,
    aside li, aside ol, aside ul {
        list-style: none !important;
        list-style-type: none !important;
        counter-reset: none !important;
        counter-increment: none !important;
    }
    nav li::marker, aside li::marker,
    nav li::before, aside li::before {
        content: none !important;
        display: none !important;
    }
    nav ol, nav ul, aside ol, aside ul {
        padding-left: 0 !important;
    }

    /* Hide loan-application link in sidebar immediately */
    a[href*="loan-application"] {
        display: none !important;
    }

    /* Active nav link colours */
    nav a.active, nav a[aria-current="page"] {
        background-color: #1d4ed8 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border-radius: 4px;
    }

    /* Remove row-click navigation cursor on list tables */
    tbody tr { cursor: default !important; }

    /* Hide Strapi's built-in "Set up preview" aside across ALL collection types.
       :has() pins to only the Preview aside (contains the docs.strapi.io link),
       so the ENTRY aside with the Save button is never affected. */
    aside:has(a[href*="docs.strapi.io/cms/features/preview"]) {
        display: none !important;
    }
`;

if (!document.getElementById('scalex-early-css')) {
    document.head.appendChild(style);
}
