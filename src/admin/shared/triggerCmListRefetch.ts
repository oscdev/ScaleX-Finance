/**
 * Soft-refresh the CM collection table via AJAX only (no page/route reload).
 * Fetches the list using each live RTK cache entry's originalArgs, then patches
 * that same cache key on _strapiAdminApp.store so ListView re-renders in place.
 *
 * Does not import adminApi.endpoints (Vite can give a duplicate module without
 * getAllDocuments — initiate would no-op while banner AJAX still works).
 */
import { stringify } from 'qs';
import {
    beginSoftRefreshPause,
    endSoftRefreshPause,
} from '../bootstrap/overlayGuard';
import { getStrapiToken } from '../bootstrap/overrides/strapiToken';
import { getCollectionUidFromHref } from '../bootstrap/pageSizeSync';
import { authHeadersFromToken } from './cmCount';
import { markSkipOverviewLoader } from './overviewSoftRemount';

const SOFT_REFRESH_PAUSE_MS = 800;
const ADMIN_API_REDUCER = 'adminApi';
const GET_ALL_DOCUMENTS = 'getAllDocuments';
const QUERY_RESULT_PATCHED = `${ADMIN_API_REDUCER}/queries/queryResultPatched`;

type GetAllDocumentsArgs = {
    model: string;
    params?: Record<string, unknown>;
};

type RtkQueryEntry = {
    endpointName?: string;
    originalArgs?: GetAllDocumentsArgs;
};

type CachedListQuery = {
    queryCacheKey: string;
    args: GetAllDocumentsArgs;
};

function getAdminStore(): {
    dispatch: (action: unknown) => unknown;
    getState: () => unknown;
} | null {
    const store = (window as any)._strapiAdminApp?.store;
    if (!store?.dispatch || !store?.getState) return null;
    return store;
}

/** Live getAllDocuments cache entries for this collection UID (no subscription filter). */
function listCachedGetAllDocuments(
    state: Record<string, unknown> | undefined,
    uid: string,
): CachedListQuery[] {
    const slice = state?.[ADMIN_API_REDUCER] as
        | { queries?: Record<string, RtkQueryEntry> }
        | undefined;
    if (!slice?.queries) return [];

    const out: CachedListQuery[] = [];
    const seen = new Set<string>();

    for (const [queryCacheKey, entry] of Object.entries(slice.queries)) {
        const isGetAll =
            entry?.endpointName === GET_ALL_DOCUMENTS ||
            queryCacheKey.startsWith(`${GET_ALL_DOCUMENTS}(`);
        if (!isGetAll) continue;

        const args = entry?.originalArgs;
        if (!args || args.model !== uid) continue;

        const dedupeKey = stringify(args, { encode: false });
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        out.push({ queryCacheKey, args });
    }

    return out;
}

function cmListRequestUrl(args: GetAllDocumentsArgs): string {
    const base = `/content-manager/collection-types/${args.model}`;
    const params = args.params ?? {};
    const qs = stringify(params, { encode: true, addQueryPrefix: true, skipNulls: true });
    return `${base}${qs}`;
}

async function fetchGetAllDocumentsPayload(
    args: GetAllDocumentsArgs,
): Promise<unknown | null> {
    try {
        const token = getStrapiToken();
        const res = await fetch(cmListRequestUrl(args), {
            headers: authHeadersFromToken(token),
            credentials: 'include',
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error('CM list AJAX refetch failed:', err);
        return null;
    }
}

/** Immer-patch substate.data for an existing ListView query cache key. */
function patchQueryData(
    dispatch: (action: unknown) => unknown,
    queryCacheKey: string,
    data: unknown,
): void {
    dispatch({
        type: QUERY_RESULT_PATCHED,
        payload: {
            queryCacheKey,
            patches: [{ op: 'replace', path: [], value: data }],
        },
    });
}

async function refetchCmDocumentList(uid: string): Promise<void> {
    if (uid === 'api::lead.lead') {
        (window as any)._assignedLeadIds = null;
    }

    markSkipOverviewLoader();

    const store = getAdminStore();
    if (!store) return;

    const state = store.getState() as Record<string, unknown>;
    const cached = listCachedGetAllDocuments(state, uid);
    if (cached.length === 0) return;

    await Promise.all(
        cached.map(async (entry) => {
            const data = await fetchGetAllDocumentsPayload(entry.args);
            if (data == null) return;
            patchQueryData(store.dispatch, entry.queryCacheKey, data);
        }),
    );
}

export function triggerCmListRefetch(): void {
    try {
        const uid = getCollectionUidFromHref(decodeURIComponent(window.location.href));
        if (!uid) return;

        beginSoftRefreshPause(SOFT_REFRESH_PAUSE_MS);
        void refetchCmDocumentList(uid).finally(() => {
            window.setTimeout(() => endSoftRefreshPause(), SOFT_REFRESH_PAUSE_MS);
        });
    } catch (err) {
        endSoftRefreshPause();
        console.error('CM list refetch trigger failed:', err);
    }
}
