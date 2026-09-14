import { useState, useEffect } from 'react';
import {
    authHeadersFromToken,
    cmCollectionUrl,
    fetchPaginationTotal,
} from '../shared/cmCount';

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
    const [stats, setStats] = useState<AdvisorStats>(initialStats);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let retryCount = 0;
        const fetchStats = async () => {
            try {
                const token = getToken();
                if (!token && retryCount < 5) {
                    retryCount++;
                    setTimeout(fetchStats, 1000);
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
            } catch (err) {
                console.error('Advisor Dashboard Fetch Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return { stats, loading };
};
