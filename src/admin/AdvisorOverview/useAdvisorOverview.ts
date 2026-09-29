import { useState, useEffect, useCallback, useRef } from 'react';
import {
    authHeadersFromToken,
    cmCollectionUrl,
    fetchPaginationTotal,
} from '../shared/cmCount';
import { triggerCmListRefetch } from '../shared/triggerCmListRefetch';
import { consumeSkipOverviewLoader, stashOverviewStats, takeStashedOverviewStats } from '../shared/overviewSoftRemount';

export interface AdvisorStats {
    total: number;
    active: number;
    inactive: number;
}

const initialStats: AdvisorStats = {
    total: 0,
    active: 0,
    inactive: 0,
};

const getToken = (): string => {
    const captured = (window as any)._strapi_last_token;
    if (captured && typeof captured === 'string') {
        return captured.replace('Bearer ', '').trim();
    }
    try {
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
                const val = window.localStorage.getItem(key);
                if (val && (val.startsWith('ey') || (val.startsWith('"ey') && val.endsWith('"')))) {
                    return val.replace(/^"|"$/g, '');
                }
            }
        }
        for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key) {
                const val = window.sessionStorage.getItem(key);
                if (val && (val.startsWith('ey') || (val.startsWith('"ey') && val.endsWith('"')))) {
                    return val.replace(/^"|"$/g, '');
                }
            }
        }
        return '';
    } catch {
        return '';
    }
};

const UID = 'api::advisor.advisor';

export const useAdvisorOverview = () => {
    const softRemountRef = useRef(consumeSkipOverviewLoader());
    const [stats, setStats] = useState<AdvisorStats>(
        () => takeStashedOverviewStats<AdvisorStats>('advisor') || initialStats
    );
    const [loading, setLoading] = useState(!softRemountRef.current);
    const [refreshing, setRefreshing] = useState(false);
    const retryCountRef = useRef(0);

    const fetchStats = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
            retryCountRef.current = 0;
        } else if (retryCountRef.current === 0 && !softRemountRef.current) {
            setLoading(true);
        }

        let scheduledRetry = false;
        try {
            const token = getToken();
            if (!token && retryCountRef.current < 5) {
                retryCountRef.current += 1;
                scheduledRetry = true;
                setTimeout(() => void fetchStats(isRefresh), 1000);
                return;
            }

            const headers = authHeadersFromToken(token);
            const [total, active] = await Promise.all([
                fetchPaginationTotal(cmCollectionUrl(UID), headers),
                fetchPaginationTotal(
                    cmCollectionUrl(UID, 'filters[advisorStatus][$eq]=Approved'),
                    headers
                ),
            ]);

            setStats({
                total,
                active,
                inactive: Math.max(0, total - active),
            });
            stashOverviewStats('advisor', {
                total,
                active,
                inactive: Math.max(0, total - active),
            });
            if (isRefresh) {
                triggerCmListRefetch();
            }
        } catch (err) {
            console.error('Advisor Dashboard Fetch Error:', err);
        } finally {
            if (!scheduledRetry) {
                softRemountRef.current = false;
                if (!isRefresh) setLoading(false);
                if (isRefresh) setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        retryCountRef.current = 0;
        void fetchStats(false);
    }, [fetchStats]);

    const refresh = useCallback(() => fetchStats(true), [fetchStats]);

    return { stats, loading, refreshing, refresh };
};
