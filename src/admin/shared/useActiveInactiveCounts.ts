import { useState, useEffect, useCallback, useRef } from 'react';
import { getStrapiToken } from '../bootstrap/overrides/strapiToken';
import {
    authHeadersFromToken,
    cmCollectionUrl,
    fetchPaginationTotal,
    parsePaginationTotal,
} from './cmCount';
import type { ActiveInactiveStats } from './ActiveInactiveOverviewDashboard';
import { triggerCmListRefetch } from './triggerCmListRefetch';
import {
    consumeSkipOverviewLoader,
    stashOverviewStats,
    takeStashedOverviewStats,
} from './overviewSoftRemount';

export type ActiveInactiveCountConfig =
    | { kind: 'cm'; uid: string; activeFilterQs: string }
    | { kind: 'admin-users' };

const emptyStats: ActiveInactiveStats = { total: 0, active: 0, inactive: 0 };

export const useActiveInactiveCounts = (config: ActiveInactiveCountConfig) => {
    const stashKey =
        config.kind === 'cm' ? `cm:${config.uid}` : 'admin-users';
    const softRemountRef = useRef(consumeSkipOverviewLoader());
    const [stats, setStats] = useState<ActiveInactiveStats>(
        () => takeStashedOverviewStats<ActiveInactiveStats>(stashKey) || emptyStats
    );
    const [loading, setLoading] = useState(!softRemountRef.current);
    const [refreshing, setRefreshing] = useState(false);
    const retryCountRef = useRef(0);
    const cancelledRef = useRef(false);

    const kind = config.kind;
    const uid = config.kind === 'cm' ? config.uid : '';
    const activeFilterQs = config.kind === 'cm' ? config.activeFilterQs : '';

    const load = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setRefreshing(true);
                retryCountRef.current = 0;
            } else if (retryCountRef.current === 0 && !softRemountRef.current) {
                setLoading(true);
            }

            let scheduledRetry = false;
            try {
                const token = getStrapiToken();
                if (!token && retryCountRef.current < 5) {
                    retryCountRef.current += 1;
                    scheduledRetry = true;
                    setTimeout(() => {
                        if (!cancelledRef.current) void load(isRefresh);
                    }, 1000);
                    return;
                }

                const headers = authHeadersFromToken(token);
                let total = 0;
                let active = 0;

                if (kind === 'cm') {
                    [total, active] = await Promise.all([
                        fetchPaginationTotal(cmCollectionUrl(uid), headers),
                        fetchPaginationTotal(cmCollectionUrl(uid, activeFilterQs), headers),
                    ]);
                } else {
                    const [totalRes, activeRes] = await Promise.all([
                        fetch('/admin/users?pageSize=1', { headers, credentials: 'include' }),
                        fetch('/admin/users?pageSize=1&filters[isActive][$eq]=true', {
                            headers,
                            credentials: 'include',
                        }),
                    ]);
                    if (totalRes.ok) total = parsePaginationTotal(await totalRes.json());
                    if (activeRes.ok) active = parsePaginationTotal(await activeRes.json());
                }

                if (!cancelledRef.current) {
                    const next = {
                        total,
                        active,
                        inactive: Math.max(0, total - active),
                    };
                    setStats(next);
                    stashOverviewStats(stashKey, next);
                    if (isRefresh) {
                        triggerCmListRefetch();
                    }
                }
            } catch (err) {
                console.error('Active/Inactive metrics fetch error:', err);
            } finally {
                if (!scheduledRetry && !cancelledRef.current) {
                    softRemountRef.current = false;
                    if (!isRefresh) setLoading(false);
                    if (isRefresh) setRefreshing(false);
                }
            }
        },
        [kind, uid, activeFilterQs, stashKey]
    );

    useEffect(() => {
        cancelledRef.current = false;
        retryCountRef.current = 0;
        void load(false);
        return () => {
            cancelledRef.current = true;
        };
    }, [load]);

    const refresh = useCallback(() => load(true), [load]);

    return { stats, loading, refreshing, refresh };
};
