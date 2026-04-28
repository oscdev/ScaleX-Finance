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
    (window as any).leadDocMap = (window as any).leadDocMap || {};
    fetch('/content-manager/collection-types/api::lead.lead?pageSize=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
        .then((r) => r.json())
        .then((data) => {
            const leads = data.results || data.data || [];
            leads.forEach((l: any) => {
                if (l.id) (window as any).leadStatusMap[l.id] = l.leadStatus || 'NEW';
                if (l.id && l.documentId) (window as any).leadDocMap[l.id] = l.documentId;
                if (l.documentId) (window as any).leadStatusMap[l.documentId] = l.leadStatus || 'NEW';
            });
        })
        .catch(() => { });
};

// ─── Lead detail dashboard (loan-application page with a lead selected) ───────

const DASHBOARD_HIDDEN_ATTR = 'data-dashboard-hidden';

// Explicitly mark Strapi's native page elements for hiding via CSS attribute selector.
// CSS class selectors (body.dashboard-mode #app > ...) only work when the server's
// Strapi DOM matches local exactly. This JS traversal works regardless of structure.
const hideEl = (el: HTMLElement) => {
    el.setAttribute(DASHBOARD_HIDDEN_ATTR, 'true');
    el.style.setProperty('display', 'none', 'important');
};

const showEl = (el: HTMLElement) => {
    el.removeAttribute(DASHBOARD_HIDDEN_ATTR);
    el.style.removeProperty('display');
};

const hideStrapiFrame = () => {
    // Identify the sidebar (first child of Strapi's flex layout row) so we can
    // skip its descendants — it contains "Content Manager" header/nav that must stay visible.
    let sidebarEl: Element | null = null;
    for (const rootSel of ['#app', '#root', '#strapi']) {
        const appRoot = document.querySelector(rootSel);
        const flexRow = appRoot?.firstElementChild;
        if (!flexRow) continue;
        const cols = Array.from(flexRow.children) as HTMLElement[];
        if (cols.length >= 1) sidebarEl = cols[0];
        // Pin sidebar column to top-left via inline style — CSS selector may not match on all servers
        const sidebar = cols[0] as HTMLElement | undefined;
        if (sidebar?.style) {
            Object.assign(sidebar.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                bottom: '0',
                width: '300px',
                overflow: 'hidden',
                zIndex: '1000',
            });
        }
        // Hide the main content column(s) — everything after the sidebar
        cols.slice(1).forEach(hideEl);
        break;
    }

    // Hide semantic page elements, but never touch anything inside the sidebar
    document.querySelectorAll<HTMLElement>('header, main, [data-strapi-header], [data-strapi-main]').forEach((el) => {
        if (sidebarEl && sidebarEl.contains(el)) return;
        hideEl(el);
    });
};

const showStrapiFrame = () => {
    document.querySelectorAll<HTMLElement>(`[${DASHBOARD_HIDDEN_ATTR}]`).forEach(showEl);
    // Restore sidebar column to normal flow
    for (const rootSel of ['#app', '#root', '#strapi']) {
        const appRoot = document.querySelector(rootSel);
        const flexRow = appRoot?.firstElementChild;
        if (!flexRow) continue;
        const sidebar = flexRow.children[0] as HTMLElement | undefined;
        if (sidebar) {
            sidebar.style.removeProperty('position');
            sidebar.style.removeProperty('top');
            sidebar.style.removeProperty('left');
            sidebar.style.removeProperty('bottom');
            sidebar.style.removeProperty('width');
            sidebar.style.removeProperty('overflow');
            sidebar.style.removeProperty('z-index');
        }
        break;
    }
};

const applyLeadDashboardOverride = (_token: string) => {
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
        hideStrapiFrame();
    } else {
        document.body.classList.remove('dashboard-mode');
        showStrapiFrame();
    }

    if (isDashboard && leadId) {
        let dashboardRoot = document.getElementById('custom-dashboard-root');
        const currentId = dashboardRoot?.getAttribute('data-lead-id');
        if (!dashboardRoot || currentId !== leadId) {
            if (dashboardRoot) unmountAndRemove('custom-dashboard-root');
            dashboardRoot = document.createElement('div');
            dashboardRoot.id = 'custom-dashboard-root';
            dashboardRoot.setAttribute('data-lead-id', leadId);
            // Force fixed layout inline — CSS alone may not apply in time or may be overridden
            Object.assign(dashboardRoot.style, {
                position: 'fixed',
                top: '0',
                right: '0',
                bottom: '0',
                left: '300px',
                background: '#f6f6f9',
                zIndex: '999',
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'block',
                visibility: 'visible',
                paddingBottom: '40px',
            });
            document.body.prepend(dashboardRoot);
            dashboardRoot.scrollTop = 0;
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

    const safe = (fn: () => void) => { try { fn(); } catch (e) { console.warn('[ScaleX override error]', e); } };

    try {
        const path = window.location.pathname;
        const isAdvisorsPage = path.includes('api::advisor.advisor');
        const isLeadsPage = path.includes('api::lead.lead');
        const isLoanPage = path.includes('api::loan-application.loan-application');
        const isDashboardMode = isLoanPage && (new URLSearchParams(window.location.search).get('view') === 'dashboard' || sessionStorage.getItem('currentLeadId'));

        // If we are NOT on a page we customize, ensure we are NOT in dashboard mode and return early.
        // This is the most critical fix to prevent breaking pages like Activity Log.
        if (!isAdvisorsPage && !isLeadsPage && !isLoanPage) {
            if (document.body.classList.contains('dashboard-mode')) {
                document.body.classList.remove('dashboard-mode');
                showStrapiFrame();
            }
            // Still run these global ones that don't affect other pages' layouts
            safe(() => applyLoginPageOverride());
            safe(() => applyNavOverride());
            safe(() => updateNavActiveStates());
            return;
        }

        // Token must be exposed on window before any module that needs it runs
        (window as any).getStrapiToken = getStrapiToken;
        const token = getStrapiToken();
        const commonHeaders = getCommonHeaders();

        if (isAdvisorsPage) safe(() => prefetchAdvisorStatusMap(commonHeaders));
        if (isLeadsPage) safe(() => prefetchLeadsData(token, commonHeaders));

        safe(() => applyAdminUserOverride(commonHeaders));
        safe(() => applyLeadDashboardOverride(token));

        safe(() => enforceDefaultListSettings());

        safe(() => applyLoginPageOverride());
        safe(() => applyNavOverride());
        safe(() => updateNavActiveStates());
        safe(() => applyButtonHardening());

        safe(() => applyLeadTableOverride());
        safe(() => applyAdvisorTableOverride());

        safe(() => ensureAdminNotifications());
        safe(() => ensureDebugBadge());
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

    // Run immediately, then burst-fire during the first 3 seconds to catch Strapi's
    // async React render completing at unpredictable times
    initOverrides();
    [100, 300, 600, 1000, 1500, 2500, 3500].forEach((ms) => setTimeout(initOverrides, ms));

    // After initial burst, keep a steady heartbeat
    setInterval(debouncedOverrides, 2000);
};
