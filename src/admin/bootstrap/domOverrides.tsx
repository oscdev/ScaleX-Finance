import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { LeadDetailDashboard } from '../LeadViewDashboard';
import { LeadActivityTimeline } from '../LeadActivityTimeline';
import { AdminNotifications } from '../AdminNotifications';
import { LoanApplicationEditForm } from '../LoanForm/LoanApplicationEditForm';
import { enforceDefaultListSettings } from '../LeadOverview/enforceListSettings';
import { reactRoots, unmountAndRemove } from './overrides/reactRoots';
import { getStrapiToken, getCommonHeaders } from './overrides/strapiToken';
import { patchHistoryMethods } from './overrides/historyPatch';
import { applyLoginPageOverride } from './overrides/loginPageOverride';
import { applyNavOverride, updateNavActiveStates, updateAddNewLeadNavVisibility } from './overrides/navOverride';
import { applyAddNewLeadPermissionRow } from './overrides/addNewLeadPermission';
import { applyAdminUserOverride } from './overrides/adminUserOverride';
import { applyAdminUsersListOverride } from './overrides/adminUsersListOverride';
import { applyButtonHardening } from './overrides/buttonHardening';
import { applyLeadTableOverride } from './overrides/leadTableOverride';
import { applyAdvisorTableOverride } from './overrides/advisorTableOverride';
import { applyRoleTabOverride } from './overrides/roleTabOverride';
import { startInviteUserOverride } from './overrides/inviteUserOverride';
import adminOverridesCss from './admin-overrides.css?inline';

if (typeof document !== 'undefined' && !document.getElementById('scalex-admin-overrides')) {
    const style = document.createElement('style');
    style.id = 'scalex-admin-overrides';
    style.textContent = adminOverridesCss;
    document.head.appendChild(style);
}

// ─── Data prefetch helpers ────────────────────────────────────────────────────

// Authenticated fetch with cookie credentials + Bearer token from any source we
// can find. Strapi v5 in some setups (incognito sessions, cookie-auth proxies)
// won't expose the JWT to localStorage early, so we always send credentials too.
const authedFetch = (url: string): Promise<Response> => {
    const captured = (window as any)._strapi_last_token as string | undefined;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (captured) {
        headers.Authorization = captured.startsWith('Bearer ') ? captured : `Bearer ${captured}`;
    }
    return fetch(url, { headers, credentials: 'include' });
};

// Polls until the fetch interceptor has captured a Bearer token, then runs cb.
// Strapi's own React app makes its first authenticated request shortly after
// mount; we just wait for that and piggy-back on the token it carries.
const whenAuthed = (cb: () => void) => {
    if ((window as any)._strapi_last_token) {
        cb();
        return;
    }
    let tries = 0;
    const id = setInterval(() => {
        tries++;
        if ((window as any)._strapi_last_token) {
            clearInterval(id);
            cb();
        } else if (tries > 50) {
            // ~10s of waiting — fall through and try anyway with cookies only
            clearInterval(id);
            cb();
        }
    }, 200);
};

const prefetchAdvisorStatusMap = () => {
    if ((window as any)._advisor_status_loaded) return;
    (window as any)._advisor_status_loaded = true;
    (window as any).advisorStatusMap = (window as any).advisorStatusMap || {};
    (window as any).advisorDocumentIdMap = (window as any).advisorDocumentIdMap || {};

    whenAuthed(() => {
        authedFetch('/content-manager/collection-types/api::advisor.advisor?pageSize=100')
            .then((r) => {
                if (!r.ok) return null; // 403/404 — no permission, don't retry
                return r.json();
            })
            .then((data) => {
                if (!data) return;
                const advisors = data.results || data.data || [];
                advisors.forEach((adv: any) => {
                    if (adv.id) (window as any).advisorStatusMap[adv.id] = adv.advisorStatus || 'Disapproved';
                    if (adv.documentId) (window as any).advisorStatusMap[adv.documentId] = adv.advisorStatus || 'Disapproved';
                    if (adv.id && adv.documentId) (window as any).advisorDocumentIdMap[adv.id] = adv.documentId;
                });
                setTimeout(initOverrides, 0);
            })
            .catch(() => {}); // network error — loaded flag stays true, no retry
    });
};

const prefetchLeadsData = () => {
    if ((window as any)._advisors_loaded) return;
    (window as any)._advisors_loaded = true;
    (window as any).advisorMap = (window as any).advisorMap || {};
    (window as any).leadStatusMap = (window as any).leadStatusMap || {};
    (window as any).leadDocMap = (window as any).leadDocMap || {};

    whenAuthed(() => {
        // Try custom endpoint first (works for all roles including Advisor).
        // If it returns 404 (Strapi not yet restarted), fall back to content-manager (works for super admin).
        authedFetch('/admin/advisors-list')
            .then((r) => {
                if (r.ok) return r.json().then((d: any) => ({ source: 'custom', data: d }));
                return authedFetch('/content-manager/collection-types/api::advisor.advisor?pageSize=100')
                    .then((r2) => (r2.ok ? r2.json().then((d: any) => ({ source: 'cm', data: d })) : null));
            })
            .then((result: any) => {
                // Both admin endpoints failed (e.g. advisor role has no CM access).
                // Fall back to the public API. Send the Bearer token in case the
                // endpoint requires authentication.
                if (!result) {
                    const captured = (window as any)._strapi_last_token as string | undefined;
                    const headers: Record<string, string> = { Accept: 'application/json' };
                    if (captured) headers.Authorization = captured.startsWith('Bearer ') ? captured : `Bearer ${captured}`;
                    return fetch('/api/advisors?pageSize=100', { headers })
                        .then((r) => (r.ok ? r.json().then((d: any) => ({ source: 'public', data: d })) : null));
                }
                return result;
            })
            .then((result: any) => {
                if (!result) return;
                const advisors: any[] = result.source === 'custom'
                    ? (result.data.data || [])
                    : (result.data.results || result.data.data || []);
                advisors.forEach((adv: any) => {
                    const id = adv.id;
                    if (!id) return;
                    const attrs = adv.attributes || adv;
                    (window as any).advisorMap[id] = {
                        name: attrs.fullName || adv.fullName,
                        id,
                        email: attrs.email || adv.email,
                        phone: attrs.phoneNumber || attrs.mobileNumber || adv.phoneNumber || adv.mobileNumber,
                    };
                });
                setTimeout(initOverrides, 0);
            })
            .catch(() => {}); // network error — loaded flag stays true, no retry

        authedFetch('/content-manager/collection-types/api::lead.lead?pageSize=100')
            .then((r) => {
                if (!r.ok) return null; // 403/404 — no permission, don't retry
                return r.json();
            })
            .then((data) => {
                if (!data) return;
                const leads = data.results || data.data || [];
                leads.forEach((l: any) => {
                    if (l.id) (window as any).leadStatusMap[l.id] = l.leadStatus || 'NEW';
                    if (l.id && l.documentId) (window as any).leadDocMap[l.id] = l.documentId;
                    if (l.documentId) (window as any).leadStatusMap[l.documentId] = l.leadStatus || 'NEW';
                });
                setTimeout(initOverrides, 0);
            })
            .catch(() => {}); // network error — loaded flag stays true, no retry
    });
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

/** Prevent hidden native CM fields from anchoring browser autofill on the custom overlay. */
const disableNativeCmAutofill = () => {
    const selector = `[${DASHBOARD_HIDDEN_ATTR}] input, [${DASHBOARD_HIDDEN_ATTR}] textarea, [${DASHBOARD_HIDDEN_ATTR}] select`;
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector).forEach((el) => {
        el.setAttribute('autocomplete', 'off');
        el.setAttribute('aria-hidden', 'true');
        el.tabIndex = -1;
        el.disabled = true;
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

const getLoanEditDocumentId = (): string | null => {
    const match = window.location.pathname.match(/api::loan-application\.loan-application\/([^/?]+)/);
    const id = match?.[1] || null;
    if (!id || id === 'create') return null;
    return id;
};

/** Tear down overlays that do not belong on the current route.
 *  Always runs at the start of initOverrides so SPA hops like Activity Log → Advisors
 *  cannot leave a sticky overlay. Skips unmount when the current path still needs that overlay
 *  (avoids remounting on MutationObserver ticks). */
const clearCustomPageOverlays = () => {
    const path = window.location.pathname;
    const wantRaw = new URLSearchParams(window.location.search).get('raw') === '1';
    const isActivityLogList =
        path.includes('api::activity-log.activity-log') &&
        !/\/api::activity-log\.activity-log\/[^/?]+/.test(path);
    const wantTimeline = isActivityLogList && !wantRaw;

    const isLoanPage = path.includes('api::loan-application.loan-application');
    const leadId = sessionStorage.getItem('currentLeadId');
    const loanEditDocumentId = getLoanEditDocumentId();
    const wantLoanEdit = !!loanEditDocumentId;
    const wantDashboard = isLoanPage && !!leadId && !wantLoanEdit;

    if (!wantLoanEdit) {
        document.body.classList.remove('loan-edit-mode');
        unmountAndRemove('custom-loan-edit-root');
    }
    if (!wantTimeline) {
        document.body.classList.remove('activity-timeline-mode');
        unmountAndRemove('custom-activity-timeline-root');
    }
    if (!wantDashboard) {
        document.body.classList.remove('dashboard-mode');
        unmountAndRemove('custom-dashboard-root');
    }
    if (!wantTimeline && !wantDashboard && !wantLoanEdit) {
        showStrapiFrame();
    }
};

const applyLoanApplicationEditOverride = () => {
    const documentId = getLoanEditDocumentId();
    if (!documentId) {
        document.body.classList.remove('loan-edit-mode');
        unmountAndRemove('custom-loan-edit-root');
        return;
    }

    document.body.classList.add('loan-edit-mode');
    hideStrapiFrame();
    disableNativeCmAutofill();

    let rootEl = document.getElementById('custom-loan-edit-root');
    const currentId = rootEl?.getAttribute('data-document-id');
    if (!rootEl || currentId !== documentId) {
        if (rootEl) unmountAndRemove('custom-loan-edit-root');
        rootEl = document.createElement('div');
        rootEl.id = 'custom-loan-edit-root';
        rootEl.setAttribute('data-document-id', documentId);
        Object.assign(rootEl.style, {
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
        document.body.prepend(rootEl);
        const root = createRoot(rootEl);
        reactRoots.set('custom-loan-edit-root', root);
        root.render(
            <DesignSystemProvider>
                <LoanApplicationEditForm documentId={documentId} />
            </DesignSystemProvider>
        );
    }
};

const applyLeadDashboardOverride = (_token: string) => {
    const isLoanPage = window.location.pathname.includes('api::loan-application.loan-application');
    const loanEditDocumentId = getLoanEditDocumentId();

    if (loanEditDocumentId) {
        document.body.classList.remove('dashboard-mode');
        unmountAndRemove('custom-dashboard-root');
        applyLoanApplicationEditOverride();
        return;
    }

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

// ─── Lead Activity Timeline (Activity Log content-manager list) ───────────────

const applyLeadActivityTimelineOverride = () => {
    const path = window.location.pathname;
    const isActivityLog =
        path.includes('api::activity-log.activity-log') &&
        !/\/api::activity-log\.activity-log\/[^/?]+/.test(path);
    const wantRaw = new URLSearchParams(window.location.search).get('raw') === '1';

    if (!isActivityLog || wantRaw) {
        unmountAndRemove('custom-activity-timeline-root');
        if (document.body.classList.contains('activity-timeline-mode')) {
            document.body.classList.remove('activity-timeline-mode');
            showStrapiFrame();
        }
        return;
    }

    document.body.classList.add('activity-timeline-mode');
    hideStrapiFrame();

    let rootEl = document.getElementById('custom-activity-timeline-root');
    if (!rootEl) {
        rootEl = document.createElement('div');
        rootEl.id = 'custom-activity-timeline-root';
        Object.assign(rootEl.style, {
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
        });
        document.body.prepend(rootEl);
        const root = createRoot(rootEl);
        reactRoots.set('custom-activity-timeline-root', root);
        root.render(
            <DesignSystemProvider>
                <LeadActivityTimeline />
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
        // Always clear sticky overlays first — then re-apply only for the current route.
        // Fixes: Activity Log → Advisors/Leads leaving the timeline covering Strapi.
        safe(() => clearCustomPageOverlays());

        const path = window.location.pathname;
        const isAdvisorsPage = path.includes('api::advisor.advisor');
        const isLeadsPage = path.includes('api::lead.lead');
        const isLoanPage = path.includes('api::loan-application.loan-application');
        const isActivityLogPage = path.includes('api::activity-log.activity-log');
        const isAdminUsersListPage = path.replace(/\/+$/, '') === '/admin/settings/users';
        const isAdminUserEditPage = /\/admin\/settings\/users\/\d+/.test(path);
        const isRoleEditPage = /\/admin\/settings\/roles\/\d+/.test(path);

        // Activity Log → custom Lead Activity Timeline (unless ?raw=1)
        if (isActivityLogPage) {
            (window as any).getStrapiToken = getStrapiToken;
            safe(() => applyLoginPageOverride());
            safe(() => applyNavOverride());
            safe(() => updateNavActiveStates());
            safe(() => applyLeadActivityTimelineOverride());
            safe(() => ensureAdminNotifications());
            return;
        }

        // Pages we don't heavily customize — native CM UI only (overlays already cleared)
        if (!isAdvisorsPage && !isLeadsPage && !isLoanPage && !isAdminUsersListPage && !isAdminUserEditPage && !isRoleEditPage) {
            // Soft default sort for mapped collections (e.g. Lenders Catalog → id:DESC)
            safe(() => enforceDefaultListSettings());
            safe(() => applyLoginPageOverride());
            safe(() => applyNavOverride());
            safe(() => updateNavActiveStates());
            safe(() => applyRoleTabOverride());
            safe(() => ensureAdminNotifications());
            return;
        }

        // Token must be exposed on window before any module that needs it runs
        (window as any).getStrapiToken = getStrapiToken;
        const token = getStrapiToken();
        const commonHeaders = getCommonHeaders();

        if (isAdvisorsPage) safe(() => prefetchAdvisorStatusMap());
        if (isLeadsPage) safe(() => prefetchLeadsData());

        safe(() => applyAdminUserOverride(commonHeaders));
        safe(() => applyAdminUsersListOverride(commonHeaders));
        // Re-enters dashboard-mode + mounts #custom-dashboard-root only when loan+leadId
        safe(() => applyLeadDashboardOverride(token));
        safe(() => applyLoanApplicationEditOverride());

        safe(() => enforceDefaultListSettings());

        safe(() => applyLoginPageOverride());
        safe(() => applyNavOverride());
        safe(() => updateNavActiveStates());
        safe(() => applyButtonHardening());

        safe(() => applyLeadTableOverride());
        safe(() => applyAdvisorTableOverride());
        safe(() => applyRoleTabOverride());

        if (isRoleEditPage) safe(() => { applyAddNewLeadPermissionRow().catch(() => {}); });

        safe(() => ensureAdminNotifications());
        safe(() => ensureDebugBadge());
    } finally {
        (window as any)._is_running_overrides = false;
    }
};

// ─── Add New Lead nav permission loader ───────────────────────────────────────

const applyNavPermissionWhenReady = (attempt = 0) => {
    // Wait for strapiUserRole — it is stored LAST in syncSessionRole, so once it
    // is present we know strapiRoleIds is also ready.
    const strapiRole = sessionStorage.getItem('strapiUserRole');
    const roleIdsRaw = sessionStorage.getItem('strapiRoleIds');

    if ((!strapiRole || !roleIdsRaw) && attempt < 20) {
        setTimeout(() => applyNavPermissionWhenReady(attempt + 1), 300);
        return;
    }

    if (!strapiRole || strapiRole === 'admin') {
        (window as any)._addNewLeadNavAllowed = true;
        updateAddNewLeadNavVisibility();
        return;
    }

    let roleIds: number[] = [];
    try { roleIds = JSON.parse(roleIdsRaw || '[]'); } catch {}
    if (roleIds.length === 0) {
        (window as any)._addNewLeadNavAllowed = true;
        updateAddNewLeadNavVisibility();
        return;
    }

    const roleId = roleIds[0];
    const captured = (window as any)._strapi_last_token as string | undefined;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (captured) headers.Authorization = captured.startsWith('Bearer ') ? captured : `Bearer ${captured}`;

    fetch(`/admin/loan-app-permissions?roleId=${roleId}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then((data: any) => {
            if (!data) { (window as any)._addNewLeadNavAllowed = true; }
            else {
                const results: any[] = data.data || [];
                const allowed = results.length === 0 || results[0].permissions?.addNewLead?.show !== false;
                (window as any)._addNewLeadNavAllowed = allowed;
            }
            updateAddNewLeadNavVisibility();
        })
        .catch(() => {
            (window as any)._addNewLeadNavAllowed = true;
            updateAddNewLeadNavVisibility();
        });
};

const loadAddNewLeadNavPermission = () => {
    whenAuthed(() => applyNavPermissionWhenReady());
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export const startDomOverrides = () => {
    patchHistoryMethods();
    startInviteUserOverride(); // persistent MutationObserver — run once globally

    let debounceTimer: any;
    const debouncedOverrides = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(initOverrides, 150);
    };

    // Re-run when the URL changes (SPA navigation) or when Strapi finishes rendering
    // a route. We watch history events + a narrowly-scoped observer on the main
    // content area only, so we don't thrash on every nested DOM mutation.
    let lastPath = window.location.pathname + window.location.search;
    const onUrlChange = () => {
        const now = window.location.pathname + window.location.search;
        if (now === lastPath) return;
        lastPath = now;
        // Strapi's list page renders the table asynchronously after the URL
        // changes. Re-apply at a few checkpoints so we don't miss late renders.
        debouncedOverrides();
        setTimeout(initOverrides, 400);
        setTimeout(initOverrides, 1000);
    };

    window.addEventListener('popstate', onUrlChange);
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args: any[]) {
        const r = origPush.apply(this, args as any);
        onUrlChange();
        return r;
    };
    history.replaceState = function (...args: any[]) {
        const r = origReplace.apply(this, args as any);
        onUrlChange();
        return r;
    };

    // Watch the main content column for child-list changes so we re-apply once
    // Strapi finishes rendering a list/edit page. Scope is much narrower than
    // observing the entire body subtree.
    const watchMain = () => {
        const main = document.querySelector('main') || document.querySelector('[data-strapi-main]');
        if (!main) {
            setTimeout(watchMain, 200);
            return;
        }
        // Subtree:true is required because Strapi renders the table deep inside
        // <main>, not as a direct child. We filter mutations originating from our
        // own injected nodes (id contains 'custom' or '-overview-root') so our
        // own DOM edits don't retrigger us.
        const observer = new MutationObserver((mutations) => {
            const fromOurs = mutations.every((m) => {
                const t = m.target as HTMLElement;
                if (!t || t.nodeType !== 1) return false;
                const id = t.id || '';
                return id.includes('custom') || id.endsWith('-overview-root') || !!t.closest('[id*="custom"], [id$="-overview-root"]');
            });
            if (fromOurs) return;
            debouncedOverrides();
        });
        observer.observe(main, { childList: true, subtree: true });
    };
    watchMain();

    // Initial run + a couple of follow-ups to catch Strapi's async first render
    initOverrides();
    setTimeout(initOverrides, 300);
    setTimeout(initOverrides, 1000);

    // Load per-role "Add New Lead" visibility once auth is available
    loadAddNewLeadNavPermission();
};
