import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { LoanAppPermissions } from '../../LoanAppPermissions';
import { reactRoots, unmountAndRemove } from './reactRoots';

const CUSTOM_TAB_ID = 'scalex-loan-app-tab';
const CUSTOM_PANEL_ID = 'scalex-loan-app-panel';

let cleanupListeners: (() => void) | null = null;

const getRoleIdFromUrl = (): number | null => {
    const m = window.location.pathname.match(/\/admin\/settings\/roles\/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
};

const fetchRoleName = async (roleId: number): Promise<string> => {
    try {
        const rawToken: string = (window as any)._strapi_last_token || '';
        const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken;
        const res = await fetch(`/admin/roles/${roleId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return `Role ${roleId}`;
        const data = await res.json();
        return data.data?.name || data.name || `Role ${roleId}`;
    } catch {
        return `Role ${roleId}`;
    }
};

const mountPanel = (roleId: number, roleName: string) => {
    let panel = document.getElementById(CUSTOM_PANEL_ID);
    if (panel) {
        panel.style.display = 'block';
        return;
    }
    // Find the tablist's parent container to append the panel after it
    const tablist = document.querySelector('[role="tablist"]');
    const container = tablist?.closest('form') || tablist?.parentElement?.parentElement || tablist?.parentElement;
    panel = document.createElement('div');
    panel.id = CUSTOM_PANEL_ID;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', CUSTOM_TAB_ID);
    if (container) {
        container.appendChild(panel);
    } else {
        document.querySelector('main')?.appendChild(panel);
    }
    const root = createRoot(panel);
    reactRoots.set(CUSTOM_PANEL_ID, root);
    root.render(
        <DesignSystemProvider>
            <LoanAppPermissions roleId={roleId} roleName={roleName} />
        </DesignSystemProvider>
    );
};

const setTabInactive = (tab: HTMLElement) => {
    tab.setAttribute('aria-selected', 'false');
    tab.style.color = '#666687';
    tab.style.fontWeight = '400';
    tab.style.backgroundColor = 'transparent';
    tab.style.borderTopLeftRadius = '0';
    tab.style.borderTopRightRadius = '0';
    tab.style.borderBottom = '2px solid transparent';
    tab.style.boxShadow = 'none';
    tab.style.zIndex = '';
};

const hideCustomPanel = () => {
    const panel = document.getElementById(CUSTOM_PANEL_ID);
    if (panel) panel.style.display = 'none';

    const tab = document.getElementById(CUSTOM_TAB_ID) as HTMLElement | null;
    if (tab) setTabInactive(tab);

    // Restore native tabpanels
    document.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((p) => {
        if (p.id !== CUSTOM_PANEL_ID) p.style.removeProperty('display');
    });
};

const activateCustomTab = async (roleId: number) => {
    // Deselect all native tabs visually
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;

    tablist.querySelectorAll<HTMLElement>('[role="tab"]').forEach((t) => {
        if (t.id !== CUSTOM_TAB_ID) t.setAttribute('aria-selected', 'false');
    });

    // Mark our tab as active — matching .mNXMA[data-state='active'] from Strapi's CSS
    const tab = document.getElementById(CUSTOM_TAB_ID) as HTMLElement | null;
    if (tab) {
        tab.setAttribute('aria-selected', 'true');
        tab.style.color = '#1d4ed8';
        tab.style.fontWeight = '600';
        tab.style.backgroundColor = '#ffffff';
        tab.style.borderTopLeftRadius = '4px';
        tab.style.borderTopRightRadius = '4px';
        tab.style.borderBottom = '1px solid #ffffff';
        tab.style.boxShadow = '0px 1px 4px rgba(33, 33, 52, 0.1)';
        tab.style.zIndex = '1';
    }

    // Hide all native tabpanels
    document.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((p) => {
        if (p.id !== CUSTOM_PANEL_ID) p.style.display = 'none';
    });

    const roleName = await fetchRoleName(roleId);
    mountPanel(roleId, roleName);
};

export const applyRoleTabOverride = () => {
    const roleId = getRoleIdFromUrl();

    if (!roleId) {
        // Clean up if we navigated away
        unmountAndRemove(CUSTOM_PANEL_ID);
        document.getElementById(CUSTOM_TAB_ID)?.remove();
        if (cleanupListeners) { cleanupListeners(); cleanupListeners = null; }
        return;
    }

    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;

    // Already injected for this role page
    if (document.getElementById(CUSTOM_TAB_ID)) return;

    // Copy tab appearance from the first native tab
    const firstTab = tablist.querySelector<HTMLElement>('[role="tab"]');

    const customTab = document.createElement('button');
    customTab.id = CUSTOM_TAB_ID;
    customTab.setAttribute('role', 'tab');
    customTab.setAttribute('aria-selected', 'false');
    customTab.setAttribute('aria-controls', CUSTOM_PANEL_ID);
    customTab.textContent = 'Loan Application';
    customTab.type = 'button';

    // Use computed padding/spacing from a native tab but hardcode font properties
    // (getComputedStyle on the active first tab returns bold weight which we don't want for inactive state)
    const cs = firstTab ? window.getComputedStyle(firstTab) : null;
    Object.assign(customTab.style, {
        background: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        padding: cs ? cs.padding : '12px 16px',
        margin: cs ? cs.margin : '0',
        fontSize: cs ? cs.fontSize : '14px',
        fontFamily: 'inherit',
        fontWeight: '400',
        letterSpacing: cs ? cs.letterSpacing : 'normal',
        lineHeight: cs ? cs.lineHeight : 'normal',
        cursor: 'pointer',
        color: '#666687',
        outline: 'none',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s, border-color 0.15s',
        boxSizing: 'border-box',
    });

    customTab.addEventListener('mouseenter', () => {
        if (customTab.getAttribute('aria-selected') !== 'true') {
            customTab.style.color = '#1d4ed8';
        }
    });
    customTab.addEventListener('mouseleave', () => {
        if (customTab.getAttribute('aria-selected') !== 'true') {
            customTab.style.color = '#666687';
        }
    });

    customTab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activateCustomTab(roleId);
    });

    tablist.appendChild(customTab);

    // When any native tab is clicked → hide our custom panel
    const nativeTabHandlers: Array<{ el: HTMLElement; fn: EventListener }> = [];
    tablist.querySelectorAll<HTMLElement>('[role="tab"]').forEach((t) => {
        if (t.id === CUSTOM_TAB_ID) return;
        const fn: EventListener = () => hideCustomPanel();
        t.addEventListener('click', fn);
        nativeTabHandlers.push({ el: t, fn });
    });

    // Intercept the page-level Save button via document-level delegation so we
    // catch the click even if Strapi re-renders the button element.
    const saveBtnFn = (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;
        if (btn.textContent?.trim() !== 'Save') return;
        if (document.getElementById(CUSTOM_TAB_ID)?.getAttribute('aria-selected') === 'true') {
            window.dispatchEvent(new CustomEvent('scalex:save-permissions'));
        }
    };
    document.addEventListener('click', saveBtnFn as EventListener, true);

    cleanupListeners = () => {
        nativeTabHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
        document.removeEventListener('click', saveBtnFn as EventListener, true);
        document.getElementById(CUSTOM_TAB_ID)?.remove();
    };
};
