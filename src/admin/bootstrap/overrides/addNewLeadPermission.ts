const API_BASE = '/admin/loan-app-permissions';
const ROW_ID = 'scalex-add-new-lead-row';
let _savingAddLead = false;
let _savingShowHide = false;
let _savingDashboardWidgets = false;

const getToken = (): string => {
    const t: string = (window as any)._strapi_last_token || '';
    return t.startsWith('Bearer ') ? t.slice(7).trim() : t;
};

const fetchRecord = async (roleId: number): Promise<{ id: number | null; permissions: any }> => {
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE}?roleId=${roleId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { id: null, permissions: {} };
        const data = await res.json();
        const results: any[] = data.data || [];
        if (results.length > 0) {
            return { id: results[0].id, permissions: results[0].permissions || {} };
        }
    } catch {}
    return { id: null, permissions: {} };
};

export const saveAddNewLeadShow = async (roleId: number, show: boolean): Promise<void> => {
    if (_savingAddLead) return;
    _savingAddLead = true;
    try {
        const token = getToken();
        const record = await fetchRecord(roleId);
        const newPerms = { ...record.permissions, addNewLead: { show } };
        await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: record.id, roleId, permissions: newPerms }),
        });
    } catch {}
    finally { _savingAddLead = false; }
};

export const loadAddNewLeadShow = async (roleId: number): Promise<boolean> => {
    const record = await fetchRecord(roleId);
    // Default true (visible) if not explicitly set to false
    return record.permissions?.addNewLead?.show !== false;
};

export const saveShowHidePasswordShow = async (roleId: number, show: boolean): Promise<void> => {
    if (_savingShowHide) return;
    _savingShowHide = true;
    try {
        const token = getToken();
        const record = await fetchRecord(roleId);
        const newPerms = { ...record.permissions, showHidePassword: { show } };
        await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: record.id, roleId, permissions: newPerms }),
        });
    } catch {}
    finally { _savingShowHide = false; }
};

/** Default false — eye icon hidden unless explicitly enabled for the role. */
export const loadShowHidePasswordShow = async (roleId: number): Promise<boolean> => {
    const record = await fetchRecord(roleId);
    return record.permissions?.showHidePassword?.show === true;
};

export const saveDashboardWidgetsShow = async (roleId: number, show: boolean): Promise<void> => {
    if (_savingDashboardWidgets) return;
    _savingDashboardWidgets = true;
    try {
        const token = getToken();
        const record = await fetchRecord(roleId);
        const newPerms = { ...record.permissions, dashboardWidgets: { show } };
        await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: record.id, roleId, permissions: newPerms }),
        });
    } catch {}
    finally { _savingDashboardWidgets = false; }
};

/** Default false — homepage widgets / Add Widget hidden unless explicitly enabled. */
export const loadDashboardWidgetsShow = async (roleId: number): Promise<boolean> => {
    const record = await fetchRecord(roleId);
    return record.permissions?.dashboardWidgets?.show === true;
};

const getRoleIdFromUrl = (): number | null => {
    const m = window.location.pathname.match(/\/admin\/settings\/roles\/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
};

export const applyAddNewLeadPermissionRow = async (): Promise<void> => {
    const roleId = getRoleIdFromUrl();

    if (!roleId) {
        document.getElementById(ROW_ID)?.remove();
        return;
    }

    // If already injected and still in DOM, skip
    const existing = document.getElementById(ROW_ID);
    if (existing) {
        if (document.body.contains(existing)) return;
        existing.remove();
    }

    // Find Collection Types tabpanel
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;

    const tabs = Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'));
    const ctTab = tabs.find(t => !t.id.includes('scalex') && t.textContent?.trim() === 'Collection Types');

    let panel: HTMLElement | null = null;
    if (ctTab) {
        const panelId = ctTab.getAttribute('aria-controls');
        if (panelId) panel = document.getElementById(panelId);
    }

    // Fallback: first tabpanel not owned by our custom tab
    if (!panel) {
        const allPanels = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
        panel = allPanels.find(p => p.id !== 'scalex-loan-app-panel') || null;
    }

    if (!panel) return;

    const [showValue, showHidePasswordValue, dashboardWidgetsValue] = await Promise.all([
        loadAddNewLeadShow(roleId),
        loadShowHidePasswordShow(roleId),
        loadDashboardWidgetsShow(roleId),
    ]);

    const row = document.createElement('div');
    row.id = ROW_ID;
    Object.assign(row.style, { borderTop: '2px solid #eaeaef', marginTop: '4px' });

    row.innerHTML = `
        <div style="display:flex;align-items:center;padding:8px 16px;background:#f0f0f9;border-bottom:1px solid #dcdce4;">
            <span style="font-size:11px;font-weight:700;color:#4945ff;text-transform:uppercase;letter-spacing:0.5px;">Custom Actions</span>
        </div>
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #f0f0f0;background:#ffffff;">
            <div style="flex:1;display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="scalex-addlead-check" ${showValue ? 'checked' : ''}
                    style="width:18px;height:18px;cursor:pointer;accent-color:#4945ff;" />
                <label for="scalex-addlead-check" style="font-size:14px;cursor:pointer;font-weight:500;">Add New Lead</label>
                <span style="font-size:12px;color:#8e8ea9;">— show "Add New Lead" button in navigation for this role</span>
            </div>
            <span id="scalex-addlead-status" style="font-size:12px;min-width:60px;text-align:right;color:#8e8ea9;"></span>
        </div>
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #f0f0f0;background:#ffffff;">
            <div style="flex:1;display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="scalex-showhide-password-check" ${showHidePasswordValue ? 'checked' : ''}
                    style="width:18px;height:18px;cursor:pointer;accent-color:#4945ff;" />
                <label for="scalex-showhide-password-check" style="font-size:14px;cursor:pointer;font-weight:500;">Show / Hide Password</label>
                <span style="font-size:12px;color:#8e8ea9;">— show eye icon on Advisor password and Users Password / Confirm Password for this role</span>
            </div>
            <span id="scalex-showhide-password-status" style="font-size:12px;min-width:60px;text-align:right;color:#8e8ea9;"></span>
        </div>
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #f0f0f0;background:#ffffff;">
            <div style="flex:1;display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="scalex-dashboard-widgets-check" ${dashboardWidgetsValue ? 'checked' : ''}
                    style="width:18px;height:18px;cursor:pointer;accent-color:#4945ff;" />
                <label for="scalex-dashboard-widgets-check" style="font-size:14px;cursor:pointer;font-weight:500;">Dashboard Widgets</label>
                <span style="font-size:12px;color:#8e8ea9;">— show homepage widgets and Add Widget for this role</span>
            </div>
            <span id="scalex-dashboard-widgets-status" style="font-size:12px;min-width:60px;text-align:right;color:#8e8ea9;"></span>
        </div>
    `;

    panel.appendChild(row);

    const checkbox = document.getElementById('scalex-addlead-check') as HTMLInputElement;
    const statusEl = document.getElementById('scalex-addlead-status') as HTMLElement;

    checkbox?.addEventListener('change', async () => {
        if (statusEl) { statusEl.textContent = 'Saving…'; statusEl.style.color = '#8e8ea9'; }
        await saveAddNewLeadShow(roleId, checkbox.checked);
        if (statusEl) { statusEl.textContent = '✓ Saved'; statusEl.style.color = '#16a34a'; }
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
    });

    const showHideCheck = document.getElementById('scalex-showhide-password-check') as HTMLInputElement;
    const showHideStatus = document.getElementById('scalex-showhide-password-status') as HTMLElement;

    showHideCheck?.addEventListener('change', async () => {
        if (showHideStatus) { showHideStatus.textContent = 'Saving…'; showHideStatus.style.color = '#8e8ea9'; }
        await saveShowHidePasswordShow(roleId, showHideCheck.checked);
        if (showHideStatus) { showHideStatus.textContent = '✓ Saved'; showHideStatus.style.color = '#16a34a'; }
        setTimeout(() => { if (showHideStatus) showHideStatus.textContent = ''; }, 2000);
    });

    const dashWidgetsCheck = document.getElementById('scalex-dashboard-widgets-check') as HTMLInputElement;
    const dashWidgetsStatus = document.getElementById('scalex-dashboard-widgets-status') as HTMLElement;

    dashWidgetsCheck?.addEventListener('change', async () => {
        if (dashWidgetsStatus) { dashWidgetsStatus.textContent = 'Saving…'; dashWidgetsStatus.style.color = '#8e8ea9'; }
        await saveDashboardWidgetsShow(roleId, dashWidgetsCheck.checked);
        if (dashWidgetsStatus) { dashWidgetsStatus.textContent = '✓ Saved'; dashWidgetsStatus.style.color = '#16a34a'; }
        setTimeout(() => { if (dashWidgetsStatus) dashWidgetsStatus.textContent = ''; }, 2000);
    });
};
