// Admin Users list override: adds ID + Product columns, injects ID + Roles filter
// controls INTO the existing Strapi search/filter toolbar row, and sorts by ID desc.

const FETCH_FLAG = '_admin_users_id_loaded';

interface AdminUserEntry {
    id: number;
    email: string;
    roleNames: string[];
}

const isAdminUsersListPath = () =>
    window.location.pathname.replace(/\/+$/, '') === '/admin/settings/users';

// ─── URL cleanup ──────────────────────────────────────────────────────────────

const cleanUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const SORT_DEFAULTS = new Set(['firstname', 'id:DESC']);
    let changed = false;
    const sort = decodeURIComponent(params.get('sort') || '');
    if (!sort || SORT_DEFAULTS.has(sort)) { params.delete('sort'); changed = true; }
    if (params.get('pageSize') === '10') { params.delete('pageSize'); changed = true; }
    if (params.get('page') === '1') { params.delete('page'); changed = true; }
    if (!changed) return;
    const qs = params.toString();
    history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
};

// ─── API fetch — admin users ──────────────────────────────────────────────────

const fetchAdminUsers = async (commonHeaders: Record<string, string>): Promise<AdminUserEntry[]> => {
    const cached = (window as any).adminUsersFullList as AdminUserEntry[] | undefined;
    if (cached && cached.length > 0) return cached;
    try {
        const res = await fetch('/admin/users?pageSize=200&sort=id:DESC', { headers: commonHeaders });
        if (!res.ok) return [];
        const data = await res.json();
        const raw = data?.data?.results || data?.results || (Array.isArray(data?.data) ? data.data : []);
        const list: AdminUserEntry[] = raw.map((u: any) => ({
            id: u.id as number,
            email: (u.email || '').toLowerCase(),
            roleNames: Array.isArray(u.roles)
                ? u.roles.map((r: any) => r.name as string).filter(Boolean)
                : [],
        }));
        (window as any).adminUsersFullList = list;
        const idMap: Record<string, number> = {};
        list.forEach((u) => { if (u.email) idMap[u.email] = u.id; });
        (window as any).adminUserEmailIdMap = idMap;
        return list;
    } catch {
        return [];
    }
};

// ─── API fetch — product mappings ─────────────────────────────────────────────

const fetchProductMappings = async (): Promise<Record<number, string>> => {
    const cached = (window as any)._staffProductMap as Record<number, string> | undefined;
    if (cached) return cached;
    try {
        // Public endpoint — no auth token needed
        const res = await fetch('/api/staff-product-mappings?pagination[pageSize]=500&fields[0]=adminUserId&fields[1]=product');
        if (!res.ok) return {};
        const data = await res.json();
        const items: any[] = data.data || [];
        const map: Record<number, string> = {};
        items.forEach((item: any) => {
            const userId = Number(item.adminUserId);
            const product = (item.product || '').trim();
            if (userId && product) map[userId] = product;
        });
        (window as any)._staffProductMap = map;
        return map;
    } catch {
        return {};
    }
};

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState { id: string; role: string; }
const getFilter = (): FilterState =>
    (window as any)._adminUsersFilter || { id: '', role: '' };
const setFilter = (patch: Partial<FilterState>) => {
    (window as any)._adminUsersFilter = { ...getFilter(), ...patch };
};

// ─── Apply filter to table rows ───────────────────────────────────────────────

const applyFilter = () => {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;
    const { id: idVal, role: roleVal } = getFilter();
    const list = (window as any).adminUsersFullList as AdminUserEntry[] | undefined;
    if (!list) return;

    const byEmail: Record<string, AdminUserEntry> = {};
    list.forEach((u) => { byEmail[u.email] = u; });

    Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr')).forEach((row) => {
        const email = findEmailInRow(row);
        const entry = email ? byEmail[email] : null;
        let show = true;
        if (idVal && entry) show = show && String(entry.id) === idVal;
        if (roleVal && entry) show = show && entry.roleNames.some((r) => r === roleVal);
        if (!entry && (idVal || roleVal)) show = false;
        row.style.display = show ? '' : 'none';
    });
};

// ─── Inject controls into the existing Strapi filter toolbar ──────────────────

const findFilterToolbar = (): HTMLElement | null => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'));
    for (const btn of buttons) {
        if (btn.closest('nav, aside')) continue;
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt === 'filters' || btn.getAttribute('aria-label')?.toLowerCase() === 'filters') {
            let el: HTMLElement | null = btn.parentElement;
            while (el && el.tagName !== 'MAIN') {
                const style = window.getComputedStyle(el);
                if (style.display === 'flex' && el.children.length >= 1) return el;
                el = el.parentElement;
            }
            return btn.parentElement;
        }
    }
    return null;
};

const FILTER_CONTROLS_ID = 'custom-admin-users-filter-controls';

const ensureFilterControls = (roles: string[]) => {
    const toolbar = findFilterToolbar();
    if (!toolbar) return;

    const existing = document.getElementById(FILTER_CONTROLS_ID);
    if (existing && !toolbar.contains(existing)) existing.remove();
    if (toolbar.contains(document.getElementById(FILTER_CONTROLS_ID))) {
        const sel = toolbar.querySelector<HTMLSelectElement>('#custom-admin-role-select');
        if (sel && sel.options.length - 1 < roles.length) {
            while (sel.options.length > 1) sel.remove(1);
            roles.forEach((r) => {
                const opt = document.createElement('option');
                opt.value = r; opt.textContent = r;
                sel.appendChild(opt);
            });
        }
        return;
    }

    const wrap = document.createElement('div');
    wrap.id = FILTER_CONTROLS_ID;
    Object.assign(wrap.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginLeft: '8px',
    });

    const sharedInput: Partial<CSSStyleDeclaration> = {
        height: '32px',
        padding: '0 10px',
        border: '1px solid #dcdce4',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'inherit',
        color: '#32324d',
        background: '#fff',
        outline: 'none',
    };

    // ID input
    const idInput = document.createElement('input');
    idInput.type = 'number';
    idInput.id = 'custom-admin-id-filter';
    idInput.placeholder = 'Filter by ID';
    Object.assign(idInput.style, { ...sharedInput, width: '120px' });
    idInput.value = getFilter().id;

    // Role select
    const roleSelect = document.createElement('select');
    roleSelect.id = 'custom-admin-role-select';
    Object.assign(roleSelect.style, { ...sharedInput, width: '150px', cursor: 'pointer' });
    const allOpt = document.createElement('option');
    allOpt.value = ''; allOpt.textContent = 'All Roles';
    roleSelect.appendChild(allOpt);
    roles.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        if (r === getFilter().role) opt.selected = true;
        roleSelect.appendChild(opt);
    });

    // Clear button — only shown when a filter is active
    const clearBtn = document.createElement('button');
    clearBtn.id = 'custom-admin-filter-clear';
    clearBtn.textContent = '✕ Clear';
    Object.assign(clearBtn.style, {
        height: '32px',
        padding: '0 10px',
        cursor: 'pointer',
        display: getFilter().id || getFilter().role ? '' : 'none',
        background: '#fee2e2',
        border: '1px solid #fca5a5',
        color: '#991b1b',
        borderRadius: '4px',
        fontWeight: '600',
        fontSize: '13px',
        fontFamily: 'inherit',
    } as Partial<CSSStyleDeclaration>);

    const updateClearVisibility = () => {
        const { id, role } = getFilter();
        clearBtn.style.display = id || role ? '' : 'none';
    };

    idInput.addEventListener('input', () => {
        setFilter({ id: idInput.value.trim() });
        updateClearVisibility();
        applyFilter();
    });
    roleSelect.addEventListener('change', () => {
        setFilter({ role: roleSelect.value });
        updateClearVisibility();
        applyFilter();
    });
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setFilter({ id: '', role: '' });
        idInput.value = '';
        roleSelect.value = '';
        updateClearVisibility();
        applyFilter();
    });

    wrap.appendChild(idInput);
    wrap.appendChild(roleSelect);
    wrap.appendChild(clearBtn);
    toolbar.appendChild(wrap);
};

// ─── Table helpers ────────────────────────────────────────────────────────────

const findEmailInRow = (row: Element): string | null => {
    for (const td of Array.from(row.querySelectorAll('td'))) {
        const m = (td.textContent || '').trim().match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
        if (m) return m[0].toLowerCase();
    }
    return null;
};

const ensureIdHeader = (headerRow: Element): number => {
    const existing = headerRow.querySelector<HTMLElement>('th.custom-admin-id-header');
    if (existing) return Array.from(headerRow.children).indexOf(existing);

    const idTh = document.createElement('th');
    idTh.className = 'custom-admin-id-header';
    idTh.innerHTML = '<span>ID</span>';
    Object.assign(idTh.style, { padding: '12px 16px', textAlign: 'left', fontWeight: '700' });

    const firstTh = headerRow.firstElementChild;
    const afterFirst = firstTh?.nextElementSibling ?? null;
    if (afterFirst) {
        headerRow.insertBefore(idTh, afterFirst);
    } else if (firstTh) {
        firstTh.insertAdjacentElement('afterend', idTh);
    } else {
        headerRow.appendChild(idTh);
    }
    return Array.from(headerRow.children).indexOf(idTh);
};

const ensureProductHeader = (headerRow: Element): number => {
    const existing = headerRow.querySelector<HTMLElement>('th.custom-admin-product-header');
    if (existing) return Array.from(headerRow.children).indexOf(existing);

    const productTh = document.createElement('th');
    productTh.className = 'custom-admin-product-header';
    productTh.innerHTML = '<span>PRODUCT</span>';
    Object.assign(productTh.style, { padding: '12px 16px', textAlign: 'left', fontWeight: '700' });

    // Insert after the Roles <th>
    const rolesHeader = Array.from(headerRow.querySelectorAll('th')).find(
        (th) => (th.textContent || '').trim().toLowerCase().includes('role')
    );
    if (rolesHeader) {
        rolesHeader.insertAdjacentElement('afterend', productTh);
    } else {
        // Fallback: before the last column (actions)
        const lastTh = headerRow.lastElementChild;
        if (lastTh) headerRow.insertBefore(productTh, lastTh);
        else headerRow.appendChild(productTh);
    }
    return Array.from(headerRow.children).indexOf(productTh);
};

const ensureIdCell = (row: Element, insertIdx: number, id: number | null) => {
    let cell = row.querySelector<HTMLElement>('td.custom-admin-id-cell');
    if (!cell) {
        cell = document.createElement('td');
        cell.className = 'custom-admin-id-cell';
        Object.assign(cell.style, { padding: '12px 16px', fontWeight: '600' });
        const ref = row.children[insertIdx] ?? null;
        row.insertBefore(cell, ref);
    }
    cell.textContent = id == null ? '—' : String(id);
    cell.setAttribute('data-admin-id', id == null ? '' : String(id));
};

const ensureProductCell = (row: Element, insertIdx: number, product: string) => {
    let cell = row.querySelector<HTMLElement>('td.custom-admin-product-cell');
    if (!cell) {
        cell = document.createElement('td');
        cell.className = 'custom-admin-product-cell';
        Object.assign(cell.style, { padding: '12px 16px' });
        const ref = row.children[insertIdx] ?? null;
        row.insertBefore(cell, ref);
    }
    cell.textContent = product || '—';
};

const sortRowsByIdDesc = (tbody: Element) => {
    const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr'));
    if (rows.length < 2) return;
    const annotated = rows.map((r) => {
        const v = r.querySelector('.custom-admin-id-cell')?.getAttribute('data-admin-id') || '';
        const n = v ? parseInt(v, 10) : NaN;
        return { row: r, id: isNaN(n) ? -Infinity : n };
    });
    if (annotated.every((a, i) => i === 0 || annotated[i - 1].id >= a.id)) return;
    annotated.sort((a, b) => b.id - a.id);
    annotated.forEach(({ row }) => tbody.appendChild(row));
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const applyAdminUsersListOverride = (commonHeaders: Record<string, string>) => {
    if (!isAdminUsersListPath()) {
        (window as any)[FETCH_FLAG] = false;
        (window as any).adminUsersFullList = undefined;
        (window as any).adminUserEmailIdMap = undefined;
        (window as any)._staffProductMap = undefined;
        document.getElementById(FILTER_CONTROLS_ID)?.remove();
        return;
    }

    cleanUrl();

    const table = document.querySelector('table');
    const headerRow = table?.querySelector('thead tr');
    const tbody = table?.querySelector('tbody');
    if (!table || !headerRow || !tbody) return;

    const idInsertIdx = ensureIdHeader(headerRow);

    const applyAll = (list: AdminUserEntry[], productMap: Record<number, string>) => {
        const idMap: Record<string, number> = {};
        list.forEach((u) => { if (u.email) idMap[u.email] = u.id; });

        const seen = new Set<string>();
        const roles: string[] = [];
        list.forEach((u) => u.roleNames.forEach((r) => {
            if (!seen.has(r)) { seen.add(r); roles.push(r); }
        }));

        ensureFilterControls(roles);

        // Product header must be inserted AFTER ID header is already in the DOM
        const productInsertIdx = ensureProductHeader(headerRow);

        Array.from(tbody.querySelectorAll('tr')).forEach((row) => {
            const email = findEmailInRow(row);
            const userId = email ? (idMap[email] ?? null) : null;
            ensureIdCell(row, idInsertIdx, userId);
            const product = userId != null ? (productMap[userId] || '') : '';
            ensureProductCell(row, productInsertIdx, product);
        });
        sortRowsByIdDesc(tbody);
        applyFilter();
    };

    const cachedUsers = (window as any).adminUsersFullList as AdminUserEntry[] | undefined;
    const cachedProducts = (window as any)._staffProductMap as Record<number, string> | undefined;

    if (cachedUsers && cachedUsers.length > 0 && cachedProducts) {
        applyAll(cachedUsers, cachedProducts);
        return;
    }

    if (!(window as any)[FETCH_FLAG]) {
        (window as any)[FETCH_FLAG] = true;
        Promise.all([
            fetchAdminUsers(commonHeaders),
            fetchProductMappings(),
        ]).then(([list, productMap]) => {
            if (isAdminUsersListPath()) applyAll(list, productMap);
        }).catch(() => { (window as any)[FETCH_FLAG] = false; });
    }
};
