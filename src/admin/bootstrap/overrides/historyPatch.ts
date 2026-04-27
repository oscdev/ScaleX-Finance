export const isCollectionTypePath = (url: string): boolean => {
    try {
        const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
        return path.includes('/content-manager/collection-types/');
    } catch {
        return false;
    }
};

const cleanUrlForHistory = (url: string): string => {
    try {
        const urlStr = url.toString();
        if (!urlStr.includes('/content-manager/collection-types/')) return urlStr;

        const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `http://x${urlStr}`);
        // Never strip view (dashboard) or id (detail) params
        if (urlObj.searchParams.has('view') || urlObj.searchParams.has('id')) return urlStr;

        // Strip technical query params on the main list view to keep URLs clean
        return urlObj.pathname;
    } catch {
        return url;
    }
};

// Collection types whose list-page row clicks should never navigate to an edit page.
// Our custom View/Login buttons use window.location.href / window.open which bypass pushState,
// so they are unaffected by this block.
const ROW_CLICK_GUARDED_TYPES = ['api::lead.lead', 'api::advisor.advisor'];

const isRowClickNavigation = (currentPath: string, newUrl: string): boolean => {
    try {
        const urlStr = newUrl.toString();
        const newPath = urlStr.startsWith('http') ? new URL(urlStr).pathname : urlStr.split('?')[0];
        
        for (const ct of ROW_CLICK_GUARDED_TYPES) {
            // Block any navigation that points to a sub-path (detail/edit page) of a guarded collection type.
            // Our custom 'View' buttons use window.location.href which bypasses history.pushState,
            // so they are unaffected by this block.
            if (newPath.includes(ct)) {
                const parts = newPath.split(ct);
                const after = parts[parts.length - 1];
                
                // If there's anything after the collection name (like an ID), block it.
                // Except for technical sub-paths like 'configurations'.
                if (after && after !== '/' && !after.includes('/configurations/')) {
                    return true;
                }
            }
        }
    } catch { /* ignore */ }
    return false;
};

export const patchHistoryMethods = () => {
    if ((window as any)._history_url_patched) return;
    (window as any)._history_url_patched = true;

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = (state: any, title: string, url?: string | URL | null) => {
        const urlStr = url ? url.toString() : '';
        if (urlStr && isRowClickNavigation(window.location.pathname, urlStr)) {
            return;
        }
        const clean = url ? cleanUrlForHistory(urlStr) : url;
        origPush(state, title, clean);
    };

    history.replaceState = (state: any, title: string, url?: string | URL | null) => {
        const urlStr = url ? url.toString() : '';
        if (urlStr && isRowClickNavigation(window.location.pathname, urlStr)) {
            return;
        }
        const clean = url ? cleanUrlForHistory(urlStr) : url;
        origReplace(state, title, clean);
    };
};
