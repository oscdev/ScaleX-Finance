import { useState, useEffect } from 'react';

export interface LeadStats {
    total: number;
    new: number;
    underProcess: number;
    approved: number;
    rejected: number;
    disbursed: number;
}

const initialStats: LeadStats = {
    total: 0,
    new: 0,
    underProcess: 0,
    approved: 0,
    rejected: 0,
    disbursed: 0,
};

const getToken = () => {
    const sessionT = window.sessionStorage.getItem('jwtToken');
    const localT = window.localStorage.getItem('jwtToken');
    const cookieT = `; ${document.cookie}`.split('; jwtToken=').pop()?.split(';').shift();
    return (sessionT || localT || cookieT || '')?.replace(/"/g, '');
};

export const useLeadOverview = () => {
    const [stats, setStats] = useState<LeadStats>(initialStats);
    const [recentLeads, setRecentLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const token = getToken();
                const authHeader: Record<string, string> = token
                    ? { Authorization: `Bearer ${token}` }
                    : {};

                // 1. Get User Profile and Roles
                const userRes = await fetch('/admin/users/me', { headers: authHeader });
                if (!userRes.ok) return;
                const userData = await userRes.json();
                const roles = userData?.data?.roles || [];
                const isAdvisor = roles.some(
                    (r: any) => r.code === 'strapi-advisor' || r.name === 'Advisor'
                );

                let advisorId = sessionStorage.getItem('strapiAdvisorId');

                // 2. SECURE WAIT: If advisor but ID not yet synced, retry briefly
                if (isAdvisor && !advisorId) {
                    let attempts = 0;
                    while (!advisorId && attempts < 20) {
                        await new Promise((r) => setTimeout(r, 100));
                        advisorId = sessionStorage.getItem('strapiAdvisorId');
                        attempts++;
                    }
                }

                // 3. Construct Filtered Query
                const filterQuery =
                    isAdvisor && advisorId
                        ? `&filters[advisorReferralId][$eq]=${advisorId}`
                        : '';

                const res = await fetch(
                    `/content-manager/collection-types/api::lead.lead?pageSize=100${filterQuery}`,
                    { headers: authHeader }
                );

                if (res.ok) {
                    const data = await res.json();
                    const leads = (data.results || data.data || []).map((l: any) => ({
                        ...l,
                        leadStatus: l.leadStatus
                            ? l.leadStatus.toUpperCase().replace(/\s+/g, '_')
                            : 'NEW',
                    }));

                    const counts: LeadStats = {
                        total: leads.length,
                        new: leads.filter((l: any) => l.leadStatus === 'NEW').length,
                        underProcess: leads.filter((l: any) => l.leadStatus === 'UNDER_PROCESS').length,
                        approved: leads.filter((l: any) => l.leadStatus === 'APPROVED').length,
                        rejected: leads.filter((l: any) => l.leadStatus === 'REJECTED').length,
                        disbursed: leads.filter((l: any) => l.leadStatus === 'DISBURSED').length,
                    };
                    setStats(counts);
                    setRecentLeads(leads.slice(0, 5));
                }
            } catch (err) {
                console.error('Lead Dashboard Fetch Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOverview();
    }, []);

    return { stats, recentLeads, loading };
};
