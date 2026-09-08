// This file runs at module evaluation time (imported first from app.tsx), which
// happens before Strapi's React app renders its first frame. Side effects only —
// page-size sync helpers live in ./pageSizeSync.

// Set body class synchronously so the CSS rule below takes effect before React
// renders the first frame — this is what prevents the Preview aside from flashing.
const setAdvisorEditClass = () => {
    const isAdvisorEdit = /api::advisor\.advisor\/[^/]+/.test(window.location.pathname);
    document.body.classList.toggle('advisor-edit-page', isAdvisorEdit);
};
setAdvisorEditClass();

// ── Collection list page-size sync (footer ↔ Configure the view) ─────────────
// Soft-fill missing URL pageSize from config; footer changes persist to config;
// Configure View saves force the list URL. See pageSizeSync.ts.
import {
    applyConfigPageSizeAfterLeavingView,
    fixCollectionPageSize,
    isDoingPageSizeReplace,
    schedulePersistPageSizeFromUrl,
    syncConfigureViewPageSize,
} from './pageSizeSync';

let _prevPathForPageSize = window.location.pathname;

// Re-sync the class on every SPA navigation (history.pushState / replaceState).
// We wrap here — before patchHistoryMethods in domOverrides — so the class is
// always current by the time React starts rendering the new route.
const _origEarlyPush = history.pushState.bind(history);
const _origEarlyReplace = history.replaceState.bind(history);
history.pushState = function (data: any, unused: string, url?: string | URL | null) {
    const r = _origEarlyPush(data, unused, url);
    setAdvisorEditClass();
    const urlStr = typeof url === 'string' ? url : (url as any)?.toString?.() ?? '';
    const onCollection =
        urlStr.includes('collection-types/api::') ||
        window.location.pathname.includes('collection-types/api::');
    if (onCollection) {
        const leftConfig =
            _prevPathForPageSize.includes('/configurations/') &&
            !window.location.pathname.includes('/configurations/');
        const enteredConfig =
            !_prevPathForPageSize.includes('/configurations/') &&
            window.location.pathname.includes('/configurations/');
        _prevPathForPageSize = window.location.pathname;
        setTimeout(() => {
            if (enteredConfig) {
                syncConfigureViewPageSize();
                return;
            }
            if (leftConfig) {
                // Apply Configure the view pageSize to footer immediately so the
                // stale list URL cannot persist-from-url and wipe the save.
                applyConfigPageSizeAfterLeavingView();
                return;
            }
            fixCollectionPageSize();
            schedulePersistPageSizeFromUrl();
        }, leftConfig ? 0 : 80);
    } else {
        _prevPathForPageSize = window.location.pathname;
    }
    return r;
};
history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
    if (isDoingPageSizeReplace()) {
        _origEarlyReplace(data, unused, url);
        return;
    }
    const leftConfig =
        _prevPathForPageSize.includes('/configurations/') &&
        !(typeof url === 'string' ? url : String(url ?? window.location.pathname)).includes('/configurations/');

    let targetHasPageSize = false;
    try {
        const urlStr = url == null ? '' : String(url);
        if (urlStr) {
            const u = new URL(urlStr, window.location.origin);
            targetHasPageSize = u.searchParams.has('pageSize') &&
                u.pathname.includes('collection-types/api::') &&
                !u.pathname.includes('/configurations/');
        }
    } catch { /* ignore */ }

    const r = _origEarlyReplace(data, unused, url);
    setAdvisorEditClass();
    _prevPathForPageSize = window.location.pathname;
    if (leftConfig) {
        applyConfigPageSizeAfterLeavingView();
        return r;
    }
    if (targetHasPageSize || (
        window.location.pathname.includes('collection-types/api::') &&
        !window.location.pathname.includes('/configurations/')
    )) {
        schedulePersistPageSizeFromUrl();
    }
    return r;
};
window.addEventListener('popstate', () => {
    setAdvisorEditClass();
    const leftConfig =
        _prevPathForPageSize.includes('/configurations/') &&
        !window.location.pathname.includes('/configurations/');
    _prevPathForPageSize = window.location.pathname;
    if (window.location.pathname.includes('/configurations/')) {
        syncConfigureViewPageSize();
    } else if (leftConfig) {
        applyConfigPageSizeAfterLeavingView();
    } else if (window.location.pathname.includes('collection-types/api::')) {
        schedulePersistPageSizeFromUrl();
    }
});

/** Sync body.scalex-theme-dark from Strapi theme (STRAPI_THEME) + system preference. */
const syncScalexAdminThemeClass = () => {
    try {
        const stored = localStorage.getItem('STRAPI_THEME') || 'system';
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = stored === 'dark' || (stored === 'system' && systemDark);
        document.body.classList.toggle('scalex-theme-dark', isDark);
    } catch {
        /* ignore */
    }
};
syncScalexAdminThemeClass();
try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncScalexAdminThemeClass);
} catch {
    /* older browsers */
}
window.addEventListener('storage', (e) => {
    if (e.key === 'STRAPI_THEME') syncScalexAdminThemeClass();
});
// Catch same-tab theme changes (Profile page writes STRAPI_THEME)
try {
    const _origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
        _origSetItem(key, value);
        if (key === 'STRAPI_THEME') syncScalexAdminThemeClass();
    };
} catch {
    /* ignore */
}

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

    /* Dark-theme layered nav: readable before full overrides load */
    body.scalex-theme-dark aside a:not([aria-current="page"]):not(.active):not(.is-nav-active),
    body.scalex-theme-dark nav a:not([aria-current="page"]):not(.active):not(.is-nav-active),
    body.scalex-theme-dark #custom-leads-add-link,
    body.scalex-theme-dark #custom-leads-overview-link:not(.is-nav-active) {
        color: #e2e8f0 !important;
    }

    /* Hide loan-application link in sidebar immediately */
    a[href*="loan-application"] {
        display: none !important;
    }

    /* Active nav link colours — solid dark blue + white (covers Strapi primary100) */
    nav a.active, nav a[aria-current="page"],
    aside a.active, aside a[aria-current="page"],
    a.is-nav-active {
        background-color: #1d4ed8 !important;
        background: #1d4ed8 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        border-radius: 4px;
        box-shadow: none !important;
    }
    nav a.active *, nav a[aria-current="page"] *,
    aside a.active *, aside a[aria-current="page"] *,
    a.is-nav-active * {
        color: #ffffff !important;
    }
    aside li:has(> a[aria-current="page"]),
    aside li:has(> a.is-nav-active),
    aside li.is-nav-active-parent,
    nav li:has(> a[aria-current="page"]),
    nav li:has(> a.is-nav-active),
    nav li.is-nav-active-parent {
        background-color: #1d4ed8 !important;
        background: #1d4ed8 !important;
        box-shadow: none !important;
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
