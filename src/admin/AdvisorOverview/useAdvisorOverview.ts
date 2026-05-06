import { useState, useEffect } from 'react';

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

const getToken = () => {
    // 1. Try captured token from fetch interceptor (Most Reliable)
    const captured = (window as any)._strapi_last_token;
    if (captured && typeof captured === 'string') {
        return captured.replace('Bearer ', '').trim();
    }

    try {
        // 2. Fallback: Scan all localStorage keys for a JWT (starts with 'ey')
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
                const val = window.localStorage.getItem(key);
                if (val && (val.startsWith('ey') || (val.startsWith('"ey') && val.endsWith('"')))) {
                    return val.replace(/^"|"$/g, '');
                }
            }
        }
        // 3. Fallback: Scan sessionStorage
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
    } catch (e) {
        return '';
    }
};

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
                    setTimeout(fetchStats, 1000); // Retry if token not ready yet
                    return;
                }

                const authHeader: Record<string, string> = token
                    ? { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      }
                    : {};

                const res = await fetch(
                    '/content-manager/collection-types/api::advisor.advisor?pageSize=100',
                    { headers: authHeader }
                );

                if (res.ok) {
                    const data = await res.json();
                    const advisors = data.results || data.data || [];

                    setStats({
                        total: advisors.length,
                        active: advisors.filter((a: any) => a.advisorStatus === 'Approved').length,
                        inactive: advisors.filter((a: any) => a.advisorStatus !== 'Approved').length,
                    });
                }
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
