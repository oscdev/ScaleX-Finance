import { useState, useEffect } from 'react';
import { getStrapiToken } from '../bootstrap/overrides/strapiToken';
import {
    authHeadersFromToken,
    cmCollectionUrl,
    fetchPaginationTotal,
    parsePaginationTotal,
} from './cmCount';
import type { ActiveInactiveStats } from './ActiveInactiveOverviewDashboard';

export type ActiveInactiveCountConfig =
    | { kind: 'cm'; uid: string; activeFilterQs: string }
    | { kind: 'admin-users' };

const emptyStats: ActiveInactiveStats = { total: 0, active: 0, inactive: 0 };

export const useActiveInactiveCounts = (config: ActiveInactiveCountConfig) => {
    const [stats, setStats] = useState<ActiveInactiveStats>(emptyStats);
    const [loading, setLoading] = useState(true);

    const kind = config.kind;
    const uid = config.kind === 'cm' ? config.uid : '';
    const activeFilterQs = config.kind === 'cm' ? config.activeFilterQs : '';

    useEffect(() => {
        let cancelled = false;
        let retryCount = 0;

        const load = async () => {
            try {
                const token = getStrapiToken();
                if (!token && retryCount < 5) {
                    retryCount++;
                    setTimeout(load, 1000);
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

                if (!cancelled) {
                    setStats({
                        total,
                        active,
                        inactive: Math.max(0, total - active),
                    });
                }
            } catch (err) {
                console.error('Active/Inactive metrics fetch error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [kind, uid, activeFilterQs]);

    return { stats, loading };
};
