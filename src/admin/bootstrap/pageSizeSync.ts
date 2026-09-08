/**
 * Keep footer "Entries per page" (URL ?pageSize=) and Configure the view
 * settings.pageSize in sync for Content Manager collection lists.
 *
 * Footer → server: PUT only settings.pageSize on the stored config (keep layouts
 * and metadatas.id). On 403, keep localStorage overlay.
 * Configure View Save → footer via fetchInterceptor applyConfiguredPageSize.
 *
 * After a Configure the view save, a short lock stops the stale list URL from
 * overwriting the saved size. Footer dropdown clicks clear that lock so list
 * pagination keeps working.
 */

import { getCommonHeaders } from './overrides/strapiToken';

type FixOpts = { force?: boolean };

const LOCAL_PAGE_SIZE_KEY = 'scalex.cm.pageSizes';
const SETTINGS_KEYS = [
    'searchable',
    'filterable',
    'bulkable',
    'pageSize',
    'mainField',
    'defaultSortBy',
    'defaultSortOrder',
] as const;
const FORBIDDEN_LIST_LAYOUT = new Set(['id', 'documentId', 'publishedAt']);
const FORBIDDEN_METADATA_KEYS = new Set(['documentId', 'publishedAt']);

const PAGE_SIZE_OPTIONS = new Set([10, 20, 50, 100]);
/** Absorb React Router restoring the old list ?pageSize= after leaving Configure the view. */
const CONFIG_SAVE_LOCK_MS = 2500;

let _doingPageSizeReplace = false;
let _pageSizePersistTimer: ReturnType<typeof setTimeout> | null = null;
const _pendingPageSizePersist: Record<string, number> = {};
let _userChangedConfigPageSize = false;
let _configPageSizeListenerBound = false;
let _patchingConfigPageSize = false;
let _configSaveLock: { uid: string; pageSize: number; until: number } | null = null;

const readLocalPageSizes = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem(LOCAL_PAGE_SIZE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeLocalPageSize = (uid: string, pageSize: number) => {
    try {
        const all = readLocalPageSizes();
        all[uid] = pageSize;
        localStorage.setItem(LOCAL_PAGE_SIZE_KEY, JSON.stringify(all));
    } catch {
        /* ignore quota / private mode */
    }
};

const hydrateConfiguredPageSizes = () => {
    if (!(window as any)._configuredPageSizes) (window as any)._configuredPageSizes = {};
    const local = readLocalPageSizes();
    for (const [uid, ps] of Object.entries(local)) {
        const n = Number(ps);
        if (uid && Number.isFinite(n) && n > 0) {
            (window as any)._configuredPageSizes[uid] = n;
        }
    }
};
hydrateConfiguredPageSizes();

export const getCollectionUidFromHref = (href: string): string | null => {
    const m = href.match(/collection-types\/(api::[^/?#]+)/);
    return m ? m[1] : null;
};

export const getSharedPageSize = (uid: string): number | null => {
    const mem = Number((window as any)._configuredPageSizes?.[uid]);
    if (Number.isFinite(mem) && mem > 0) return mem;
    const local = Number(readLocalPageSizes()[uid]);
    if (Number.isFinite(local) && local > 0) return local;
    return null;
};

export const lockConfigDrivenPageSize = (uid: string, pageSize: number, ms = CONFIG_SAVE_LOCK_MS) => {
    if (!uid || !Number.isFinite(pageSize) || pageSize < 1) return;
    _configSaveLock = { uid, pageSize, until: Date.now() + ms };
};

export const getLockedConfigPageSize = (uid: string): number | null => {
    if (!_configSaveLock || _configSaveLock.uid !== uid) return null;
    if (typeof window !== 'undefined' && window.location.pathname.includes('/configurations/')) {
        return _configSaveLock.pageSize;
    }
    if (Date.now() > _configSaveLock.until) {
        _configSaveLock = null;
        return null;
    }
    return _configSaveLock.pageSize;
};

export const clearConfigPageSizeLock = (uid?: string) => {
    if (!uid || _configSaveLock?.uid === uid) _configSaveLock = null;
};

/** While a Configure the view save is locked, rewrite list GET pageSize. Skip id lookups. */
export const ensureDashboardListPageSizeUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('/content-manager/collection-types/')) return url;
    if (url.includes('/configuration') || url.includes('/configurations')) return url;
    if (/filters\[id\]\[\$eq\]/.test(url) || /filters\[documentId\]/.test(url)) return url;

    const match = url.match(/\/content-manager\/collection-types\/(api::[^/?#]+)/);
    const uid = match?.[1];
    if (!uid) return url;

    const uidIdx = url.indexOf(uid);
    const afterUid = uidIdx >= 0 ? url.slice(uidIdx + uid.length) : '';
    const pathPart = afterUid.split('?')[0].split('#')[0];
    if (pathPart && pathPart !== '/') return url;

    const locked = getLockedConfigPageSize(uid);
    if (locked == null) return url;

    try {
        const absolute = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        const u = new URL(absolute);
        const current = Number(u.searchParams.get('pageSize') || '0');
        if (current === locked) return url;
        u.searchParams.set('pageSize', String(locked));
        if (!u.searchParams.get('page')) u.searchParams.set('page', '1');
        if (url.startsWith('http')) return u.toString();
        return `${u.pathname}${u.search}${u.hash}`;
    } catch {
        return url;
    }
};

const authHeaders = (): Record<string, string> => {
    const h = getCommonHeaders();
    const extra = { 'X-Scalex-PageSize-Sync': '1' };
    if (!h.Authorization) {
        return { 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
    }
    return { ...h, ...extra };
};

const invalidateContentTypeConfigurationCache = (uid: string) => {
    const store = (window as any)._strapiAdminApp?.store;
    if (!store?.dispatch) return;
    try {
        store.dispatch({
            type: 'adminApi/invalidateTags',
            payload: [
                { type: 'ContentTypesConfiguration', id: uid },
                { type: 'ContentTypeSettings', id: 'LIST' },
            ],
        });
    } catch {
        /* ignore */
    }
};

/** Clone stored config; change only settings.pageSize; keep metadatas.id. */
export const buildPageSizeOnlyPutBody = (ct: any, pageSize: number) => {
    const settings: Record<string, unknown> = {};
    for (const key of SETTINGS_KEYS) {
        if (ct?.settings?.[key] !== undefined && ct.settings[key] !== null) {
            settings[key] = ct.settings[key];
        }
    }
    settings.pageSize = pageSize;
    delete (settings as any).displayName;

    const rawList: unknown[] = Array.isArray(ct?.layouts?.list) ? ct.layouts.list : [];
    const list = rawList
        .map((f) => (typeof f === 'string' ? f : (f as any)?.name))
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
        .filter((name) => !FORBIDDEN_LIST_LAYOUT.has(name));

    const metadatas: Record<string, any> = {};
    for (const [name, meta] of Object.entries(ct?.metadatas || {}) as [string, any][]) {
        if (FORBIDDEN_METADATA_KEYS.has(name)) continue;
        const listMeta = { ...(meta?.list || {}) };
        delete listMeta.visible;
        delete listMeta.mainField;
        const editMeta = meta?.edit || {};
        const edit: Record<string, unknown> = {
            label: editMeta.label ?? name,
            description: editMeta.description ?? '',
            placeholder: editMeta.placeholder ?? '',
            visible: editMeta.visible !== false,
            editable: editMeta.editable !== false,
        };
        const mf = editMeta.mainField;
        if (typeof mf === 'string' && mf.length > 0) {
            edit.mainField = mf;
        } else if (mf && typeof mf === 'object' && typeof (mf as any).name === 'string') {
            edit.mainField = (mf as any).name;
        }
        metadatas[name] = {
            edit,
            list: {
                label: listMeta.label ?? name,
                searchable: Boolean(listMeta.searchable),
                sortable: Boolean(listMeta.sortable),
            },
        };
    }

    return {
        settings,
        layouts: {
            list,
            edit: Array.isArray(ct?.layouts?.edit) ? ct.layouts.edit : [],
        },
        metadatas,
    };
};

const rememberLocal = (uid: string, pageSize: number) => {
    if (!(window as any)._configuredPageSizes) (window as any)._configuredPageSizes = {};
    (window as any)._configuredPageSizes[uid] = pageSize;
    writeLocalPageSize(uid, pageSize);
};

/** PUT settings.pageSize only. 403 → local overlay still used for Configure the view. */
export const persistPageSizeToConfig = async (uid: string, pageSize: number): Promise<boolean> => {
    if (!uid || !Number.isFinite(pageSize) || pageSize < 1) return false;
    if ((window as any)._persistingPageSizeToConfig) return false;

    rememberLocal(uid, pageSize);
    _pendingPageSizePersist[uid] = pageSize;
    (window as any)._persistingPageSizeToConfig = true;

    const originalFetch: typeof fetch =
        (window as any)._strapiOriginalFetch?.bind(window) || window.fetch.bind(window);
    const headers = authHeaders();

    try {
        const getRes = await originalFetch(`/content-manager/content-types/${uid}/configuration`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });
        if (!getRes.ok) {
            delete _pendingPageSizePersist[uid];
            invalidateContentTypeConfigurationCache(uid);
            return false;
        }

        const json = await getRes.json();
        const ct = json?.data?.contentType || json?.data;
        if (!ct?.settings) {
            delete _pendingPageSizePersist[uid];
            invalidateContentTypeConfigurationCache(uid);
            return false;
        }

        const body = buildPageSizeOnlyPutBody(ct, pageSize);
        const putRes = await originalFetch(`/content-manager/content-types/${uid}/configuration`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: JSON.stringify(body),
        });

        if (putRes.status === 403) {
            delete _pendingPageSizePersist[uid];
            invalidateContentTypeConfigurationCache(uid);
            return true;
        }
        if (!putRes.ok) {
            delete _pendingPageSizePersist[uid];
            invalidateContentTypeConfigurationCache(uid);
            return false;
        }

        rememberLocal(uid, pageSize);
        delete _pendingPageSizePersist[uid];
        invalidateContentTypeConfigurationCache(uid);
        return true;
    } catch {
        delete _pendingPageSizePersist[uid];
        invalidateContentTypeConfigurationCache(uid);
        return false;
    } finally {
        (window as any)._persistingPageSizeToConfig = false;
    }
};

export const fixCollectionPageSize = (opts: FixOpts = {}) => {
    const uid = getCollectionUidFromHref(window.location.href);
    if (!uid) return;
    if (window.location.pathname.includes('/configurations/')) return;

    const configPageSize = getSharedPageSize(uid);
    if (!configPageSize) return;

    try {
        const urlObj = new URL(window.location.href);
        const rawPageSize = urlObj.searchParams.get('pageSize');
        const urlPageSize = Number(rawPageSize || '0');

        if (!opts.force) {
            if (rawPageSize != null && rawPageSize !== '' && Number.isFinite(urlPageSize) && urlPageSize > 0) {
                return;
            }
        } else if (urlPageSize === configPageSize) {
            return;
        }

        urlObj.searchParams.set('pageSize', String(configPageSize));
        if (!urlObj.searchParams.get('page')) {
            urlObj.searchParams.set('page', '1');
        }

        _doingPageSizeReplace = true;
        history.replaceState(history.state, '', urlObj.pathname + urlObj.search + urlObj.hash);
        _doingPageSizeReplace = false;
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    } catch {
        _doingPageSizeReplace = false;
    }
};

/** Re-arm the save lock and force the list URL after leaving Configure the view. */
export const applyConfigPageSizeAfterLeavingView = () => {
    const uid = getCollectionUidFromHref(window.location.href);
    const ps = uid ? (getLockedConfigPageSize(uid) ?? getSharedPageSize(uid)) : null;
    if (uid && ps) lockConfigDrivenPageSize(uid, ps);
    fixCollectionPageSize({ force: true });
};

export const applyConfiguredPageSize = (uid: string, pageSize: number, opts?: { forceUrl?: boolean }) => {
    if (!uid || !pageSize) return;
    rememberLocal(uid, pageSize);
    if (_pendingPageSizePersist[uid] != null && _pendingPageSizePersist[uid] !== pageSize) {
        delete _pendingPageSizePersist[uid];
    }
    if (opts?.forceUrl) {
        lockConfigDrivenPageSize(uid, pageSize);
        setTimeout(() => fixCollectionPageSize({ force: true }), 0);
    } else {
        setTimeout(() => fixCollectionPageSize(), 0);
    }
};

export const schedulePersistPageSizeFromUrl = () => {
    if (_doingPageSizeReplace) return;
    if ((window as any)._persistingPageSizeToConfig) return;
    if (window.location.pathname.includes('/configurations/')) return;

    const uid = getCollectionUidFromHref(window.location.href);
    if (!uid) return;

    let urlPageSize = 0;
    try {
        urlPageSize = Number(new URL(window.location.href).searchParams.get('pageSize') || '0');
    } catch {
        return;
    }
    if (!Number.isFinite(urlPageSize) || urlPageSize < 1) return;

    const locked = getLockedConfigPageSize(uid);
    if (locked != null) {
        if (urlPageSize !== locked) {
            rememberLocal(uid, locked);
            fixCollectionPageSize({ force: true });
        }
        return;
    }

    const configured = getSharedPageSize(uid);
    if (configured === urlPageSize && !_pendingPageSizePersist[uid]) return;

    rememberLocal(uid, urlPageSize);
    _pendingPageSizePersist[uid] = urlPageSize;

    if (_pageSizePersistTimer) clearTimeout(_pageSizePersistTimer);
    _pageSizePersistTimer = setTimeout(() => {
        void persistPageSizeToConfig(uid, urlPageSize);
    }, 300);
};

export const isDoingPageSizeReplace = () => _doingPageSizeReplace;

/** First GET only: do not overwrite an existing footer/local preference with server 20. */
export const rememberConfiguredPageSizeFromGet = (uid: string, pageSize: number) => {
    if (!uid || !pageSize) return;
    if (_pendingPageSizePersist[uid] != null) {
        setTimeout(() => fixCollectionPageSize(), 0);
        return;
    }
    if (getSharedPageSize(uid) != null) {
        setTimeout(() => fixCollectionPageSize(), 0);
        return;
    }
    applyConfiguredPageSize(uid, pageSize, { forceUrl: false });
};

const findEntriesPerPageTrigger = (): HTMLElement | null => {
    const nodes = Array.from(document.querySelectorAll('label, span, p, div'));
    const hintOrLabel = nodes.find((el) => {
        const t = (el.textContent || '').trim();
        return t === 'Entries per page' || t.startsWith('Note: You can override this value');
    });
    if (!hintOrLabel) return null;
    const root = hintOrLabel.closest('[class]') || hintOrLabel.parentElement;
    const scope = root?.parentElement || root;
    if (!scope) return null;
    const btn = scope.querySelector('button[aria-haspopup], [role="combobox"], button');
    return (btn as HTMLElement) || null;
};

/** Set Configure the view Entries per page control to the shared value. */
export const patchConfigureViewPageSizeControl = () => {
    if (_userChangedConfigPageSize) return;
    if (!window.location.pathname.includes('/configurations/')) return;
    const uid = getCollectionUidFromHref(window.location.href);
    if (!uid) return;
    const pageSize = getSharedPageSize(uid);
    if (!pageSize) return;
    const want = String(pageSize);

    const trigger = findEntriesPerPageTrigger();
    if (!trigger) return;
    const shown = (trigger.textContent || '').replace(/\s+/g, ' ').trim();
    if (shown === want || shown.includes(want)) return;

    try {
        _patchingConfigPageSize = true;
        trigger.click();
        window.setTimeout(() => {
            const options = Array.from(document.querySelectorAll('[role="option"], [role="listbox"] *'));
            const match = options.find((el) => (el.textContent || '').trim() === want);
            if (match instanceof HTMLElement) {
                match.click();
            } else {
                document.body.click();
            }
            _patchingConfigPageSize = false;
        }, 50);
    } catch {
        _patchingConfigPageSize = false;
    }
};

const onPageSizeOptionClick = (event: Event) => {
    if (_patchingConfigPageSize) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const option = target.closest('[role="option"]');
    if (!option) return;
    const value = Number((option.textContent || '').trim());
    if (!PAGE_SIZE_OPTIONS.has(value)) return;

    const uid = getCollectionUidFromHref(window.location.href);
    if (!uid) return;

    if (window.location.pathname.includes('/configurations/')) {
        _userChangedConfigPageSize = true;
        lockConfigDrivenPageSize(uid, value);
        rememberLocal(uid, value);
        _pendingPageSizePersist[uid] = value;
        if (_pageSizePersistTimer) clearTimeout(_pageSizePersistTimer);
        _pageSizePersistTimer = setTimeout(() => {
            void persistPageSizeToConfig(uid, value);
        }, 300);
        return;
    }

    // Footer Entries per page: user intent wins over a recent Configure the view save.
    clearConfigPageSizeLock(uid);
    rememberLocal(uid, value);
};

const bindConfigureViewPageSizeListener = () => {
    if (_configPageSizeListenerBound) return;
    _configPageSizeListenerBound = true;
    document.addEventListener('click', onPageSizeOptionClick, true);
};

export const syncConfigureViewPageSize = () => {
    const uid = getCollectionUidFromHref(window.location.href);
    if (!uid || !window.location.pathname.includes('/configurations/')) return;
    _userChangedConfigPageSize = false;
    bindConfigureViewPageSizeListener();
    const memPs = getSharedPageSize(uid);
    if (!memPs) return;
    invalidateContentTypeConfigurationCache(uid);
    [80, 200, 450, 900].forEach((ms) => {
        window.setTimeout(patchConfigureViewPageSizeControl, ms);
    });
};

(window as any)._fixCollectionPageSize = fixCollectionPageSize;
(window as any)._schedulePersistPageSizeFromUrl = schedulePersistPageSizeFromUrl;
(window as any)._applyConfiguredPageSize = applyConfiguredPageSize;
(window as any)._applyConfigPageSizeAfterLeavingView = applyConfigPageSizeAfterLeavingView;
(window as any)._syncConfigureViewPageSize = syncConfigureViewPageSize;
bindConfigureViewPageSizeListener();
