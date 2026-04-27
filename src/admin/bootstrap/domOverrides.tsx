import React from 'react';
import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { LeadDetailDashboard } from '../LeadViewDashboard';
import { AdminNotifications } from '../AdminNotifications';
import { enforceDefaultListSettings } from '../LeadOverview/enforceListSettings';
import { reactRoots, unmountAndRemove } from './overrides/reactRoots';
import { getStrapiToken, getCommonHeaders } from './overrides/strapiToken';
import { patchHistoryMethods } from './overrides/historyPatch';
import { applyLoginPageOverride } from './overrides/loginPageOverride';
import { applyNavOverride, updateNavActiveStates } from './overrides/navOverride';
import { applyAdminUserOverride } from './overrides/adminUserOverride';
import { applyButtonHardening } from './overrides/buttonHardening';
import { applyLeadTableOverride } from './overrides/leadTableOverride';
import { applyAdvisorTableOverride } from './overrides/advisorTableOverride';
import './admin-overrides.css';

// ─── Data prefetch helpers ────────────────────────────────────────────────────

const prefetchAdvisorStatusMap = (commonHeaders: Record<string, string>) => {
    if ((window as any)._advisor_status_loaded) return;
    (window as any)._advisor_status_loaded = true;
    (window as any).advisorStatusMap = (window as any).advisorStatusMap || {};
    (window as any).advisorDocumentIdMap = (window as any).advisorDocumentIdMap || {};

    fetch('/content-manager/collection-types/api::advisor.advisor?pageSize=100', {
        headers: commonHeaders,
    })
        .then((r) => r.json())
        .then((data) => {
            const advisors = data.results || data.data || [];
            advisors.forEach((adv: any) => {
                if (adv.id) (window as any).advisorStatusMap[adv.id] = adv.advisorStatus || 'Disapproved';
                if (adv.documentId) (window as any).advisorStatusMap[adv.documentId] = adv.advisorStatus || 'Disapproved';
                if (adv.id && adv.documentId) (window as any).advisorDocumentIdMap[adv.id] = adv.documentId;
            });
        })
        .catch(() => { (window as any)._advisor_status_loaded = false; });
};

const prefetchLeadsData = (token: string, commonHeaders: Record<string, string>) => {
    if ((window as any)._advisors_loaded) return;
    (window as any)._advisors_loaded = true;
    (window as any).advisorMap = (window as any).advisorMap || {};

    fetch('/content-manager/collection-types/api::advisor.advisor?pageSize=100', {
        headers: commonHeaders,
    })
        .then((r) => r.json())
        .then((data) => {
            const advisors = data.results || data.data || [];
            advisors.forEach((adv: any) => {
                (window as any).advisorMap[adv.id] = {
                    name: adv.fullName,
                    id: adv.id,
                    email: adv.email,
                    phone: adv.phoneNumber,
                };
            });
        })
        .catch(() => { (window as any)._advisors_loaded = false; });

    (window as any).leadStatusMap = (window as any).leadStatusMap || {};
    fetch('/content-manager/collection-types/api::lead.lead?pageSize=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
        .then((r) => r.json())
        .then((data) => {
            const leads = data.results || data.data || [];
            leads.forEach((l: any) => {
                if (l.id) (window as any).leadStatusMap[l.id] = l.leadStatus || 'NEW';
                if (l.documentId) (window as any).leadStatusMap[l.documentId] = l.leadStatus || 'NEW';
            });
        })
        .catch(() => { });
};

// ─── Lead detail dashboard (loan-application page with a lead selected) ───────

const applyLeadDashboardOverride = (token: string) => {
    const isLoanPage = window.location.pathname.includes('api::loan-application.loan-application');

    if (isLoanPage && window.location.search) {
        const qsId = new URLSearchParams(window.location.search).get('id');
        if (qsId) sessionStorage.setItem('currentLeadId', qsId);
        history.replaceState(null, '', window.location.pathname);
    }

    const leadId = sessionStorage.getItem('currentLeadId');
    const isDashboard = isLoanPage && !!leadId;

    if (isDashboard) {
        document.body.classList.add('dashboard-mode');
    } else {
        document.body.classList.remove('dashboard-mode');
    }

    if (isDashboard && leadId) {
        let dashboardRoot = document.getElementById('custom-dashboard-root');
        const currentId = dashboardRoot?.getAttribute('data-lead-id');
        if (!dashboardRoot || currentId !== leadId) {
            if (dashboardRoot) unmountAndRemove('custom-dashboard-root');
            dashboardRoot = document.createElement('div');
            dashboardRoot.id = 'custom-dashboard-root';
            dashboardRoot.setAttribute('data-lead-id', leadId);
            document.body.prepend(dashboardRoot);
            const root = createRoot(dashboardRoot);
            reactRoots.set('custom-dashboard-root', root);
            root.render(
                <DesignSystemProvider>
                    <LeadDetailDashboard leadId={leadId} />
                </DesignSystemProvider>
            );
        }
    } else {
        unmountAndRemove('custom-dashboard-root');
    }
};

// ─── Admin notifications (global, always mounted) ─────────────────────────────

const ensureAdminNotifications = () => {
    if (!document.getElementById('admin-notifications-root')) {
        const notifyRoot = document.createElement('div');
        notifyRoot.id = 'admin-notifications-root';
        document.body.appendChild(notifyRoot);
        const root = createRoot(notifyRoot);
        reactRoots.set('admin-notifications-root', root);
        root.render(
            <DesignSystemProvider>
                <AdminNotifications />
            </DesignSystemProvider>
        );
    }
};

const ensureDebugBadge = () => {
    if (!document.getElementById('strapi-custom-debug')) {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'strapi-custom-debug';
        debugDiv.textContent = 'Strapi Custom Script Active';
        document.body.prepend(debugDiv);
    }
};

// ─── Main orchestrator ────────────────────────────────────────────────────────

const initOverrides = () => {
    if ((window as any)._is_running_overrides) return;
    (window as any)._is_running_overrides = true;

    try {
        // Token must be exposed on window before any module that needs it runs
        (window as any).getStrapiToken = getStrapiToken;
        const token = getStrapiToken();
        const commonHeaders = getCommonHeaders();

        const isAdvisorsPage = window.location.pathname.includes('api::advisor.advisor');
        const isLeadsPage = window.location.pathname.includes('api::lead.lead');

        if (isAdvisorsPage) prefetchAdvisorStatusMap(commonHeaders);
        if (isLeadsPage) prefetchLeadsData(token, commonHeaders);

        applyAdminUserOverride(commonHeaders);
        applyLeadDashboardOverride(token);

        enforceDefaultListSettings();

        applyLoginPageOverride();
        applyNavOverride();
        updateNavActiveStates();
        applyButtonHardening();

        applyLeadTableOverride();
        applyAdvisorTableOverride();

        ensureAdminNotifications();
        ensureDebugBadge();
    } finally {
        (window as any)._is_running_overrides = false;
    }
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export const startDomOverrides = () => {
    patchHistoryMethods();

    let debounceTimer: any;
    const debouncedOverrides = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(initOverrides, 200);
    };

    const observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => (m.target as HTMLElement).id?.includes('custom'))) return;
        debouncedOverrides();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Instantly re-apply after user clicks to eliminate visual delays
    document.addEventListener('click', () => {
        setTimeout(initOverrides, 10);
        setTimeout(initOverrides, 50); // Double-catch after Strapi React render cycle
    });

    setInterval(debouncedOverrides, 2000);
    initOverrides();
};
