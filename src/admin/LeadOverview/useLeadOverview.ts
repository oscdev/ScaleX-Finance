import { useState, useEffect, useCallback, useRef } from 'react';
import {
    authHeadersFromToken,
    cmCollectionUrl,
    fetchPaginationTotal,
} from '../shared/cmCount';
import { triggerCmListRefetch } from '../shared/triggerCmListRefetch';
import { consumeSkipOverviewLoader, stashOverviewStats, takeStashedOverviewStats } from '../shared/overviewSoftRemount';

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

const UID = 'api::lead.lead';

const leadFilterQs = (advisorId: string | null, status?: string): string => {
    const parts: string[] = [];
    if (advisorId) parts.push(`filters[advisorReferralId][$eq]=${encodeURIComponent(advisorId)}`);
    if (status) parts.push(`filters[leadStatus][$eq]=${encodeURIComponent(status)}`);
    return parts.join('&');
};

type FetchMode = 'initial' | 'refresh';

export const useLeadOverview = () => {
    const softRemountRef = useRef(consumeSkipOverviewLoader());
    const [stats, setStats] = useState<LeadStats>(
        () => takeStashedOverviewStats<LeadStats>('lead') || initialStats
    );
    const [recentLeads, setRecentLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(!softRemountRef.current);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOverview = useCallback(async (mode: FetchMode = 'initial') => {
        if (mode === 'refresh') setRefreshing(true);
        else if (!softRemountRef.current) setLoading(true);
        try {
            const token = getToken();
            const headers = authHeadersFromToken(token);

            const userRes = await fetch('/admin/users/me', { headers, credentials: 'include' });
            if (!userRes.ok) return;
            const userData = await userRes.json();
            const roles = userData?.data?.roles || [];
            const isAdvisor = roles.some(
                (r: any) => r.code === 'strapi-advisor' || r.name === 'Advisor'
            );

            let advisorId = sessionStorage.getItem('strapiAdvisorId');
            if (isAdvisor && !advisorId) {
                let attempts = 0;
                while (!advisorId && attempts < 20) {
                    await new Promise((r) => setTimeout(r, 100));
                    advisorId = sessionStorage.getItem('strapiAdvisorId');
                    attempts++;
                }
            }

            const scopeId = isAdvisor && advisorId ? advisorId : null;

            const [total, newC, underC, approvedC, rejectedC, disbursedC, recentRes] =
                await Promise.all([
                    fetchPaginationTotal(cmCollectionUrl(UID, leadFilterQs(scopeId)), headers),
                    fetchPaginationTotal(
                        cmCollectionUrl(UID, leadFilterQs(scopeId, 'NEW')),
                        headers
                    ),
                    fetchPaginationTotal(
                        cmCollectionUrl(UID, leadFilterQs(scopeId, 'UNDER_PROCESS')),
                        headers
                    ),
                    fetchPaginationTotal(
                        cmCollectionUrl(UID, leadFilterQs(scopeId, 'APPROVED')),
                        headers
                    ),
                    fetchPaginationTotal(
                        cmCollectionUrl(UID, leadFilterQs(scopeId, 'REJECTED')),
                        headers
                    ),
                    fetchPaginationTotal(
                        cmCollectionUrl(UID, leadFilterQs(scopeId, 'DISBURSED')),
                        headers
                    ),
                    fetch(
                        `/content-manager/collection-types/${UID}?pageSize=5&sort=id:DESC${
                            scopeId
                                ? `&filters[advisorReferralId][$eq]=${encodeURIComponent(scopeId)}`
                                : ''
                        }`,
                        { headers, credentials: 'include' }
                    ),
                ]);

            setStats({
                total,
                new: newC,
                underProcess: underC,
                approved: approvedC,
                rejected: rejectedC,
                disbursed: disbursedC,
            });
            stashOverviewStats('lead', {
                total,
                new: newC,
                underProcess: underC,
                approved: approvedC,
                rejected: rejectedC,
                disbursed: disbursedC,
            });

            if (recentRes.ok) {
                const data = await recentRes.json();
                const leads = (data.results || data.data || []).map((l: any) => ({
                    ...l,
                    leadStatus: l.leadStatus
                        ? String(l.leadStatus).toUpperCase().replace(/\s+/g, '_')
                        : 'NEW',
                }));
                setRecentLeads(leads.slice(0, 5));
            }

            if (mode === 'refresh') {
                triggerCmListRefetch();
            }
        } catch (err) {
            console.error('Lead Dashboard Fetch Error:', err);
        } finally {
            softRemountRef.current = false;
            if (mode === 'initial') setLoading(false);
            if (mode === 'refresh') setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchOverview('initial');
    }, [fetchOverview]);

    const refresh = useCallback(() => fetchOverview('refresh'), [fetchOverview]);

    return { stats, recentLeads, loading, refreshing, refresh };
};
