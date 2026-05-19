// Handles the admin user edit page (/admin/settings/users/:id).
// 1. Pre-fills password fields from the advisor record.
// 2. Injects a "Product" dropdown, visible only when the Staff role is selected,
//    pre-filled from staff_product_mappings and saved via fetchInterceptor on PUT.

const EDIT_PRODUCT_ID = 'scalex-edit-product-field';

// ─── Role detection ───────────────────────────────────────────────────────────
// Reuses the same chip-detection pattern as inviteUserOverride:
// selected role chips are leaf elements outside any [role="listbox"].

const isStaffRoleOnEditPage = (): boolean => {
    const inListbox = (el: Element) => !!el.closest('[role="listbox"]');
    const inOurField = (el: Element) => !!el.closest(`#${EDIT_PRODUCT_ID}`);
    return Array.from(document.querySelectorAll<HTMLElement>('span, div'))
        .filter(el => !inListbox(el) && !inOurField(el))
        .some(el => {
            const hasNoComplexChildren = el.querySelectorAll('span, div').length === 0;
            const text = (el.textContent || '').trim().toLowerCase();
            return hasNoComplexChildren && text.includes('staff');
        });
};

// ─── Fetch existing product mapping ──────────────────────────────────────────

const fetchExistingProductMapping = async (
    adminId: string,
    _commonHeaders: Record<string, string>
): Promise<{ documentId: string; product: string } | null> => {
    try {
        const res = await fetch(
            `/api/staff-product-mappings?filters[adminUserId][$eq]=${adminId}&pagination[pageSize]=1`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const item = (data.data || [])[0];
        if (!item) return null;
        return { documentId: item.documentId as string, product: (item.product || '') as string };
    } catch {
        return null;
    }
};

// ─── Fetch product options (shared cache with invite override) ────────────────

const fetchProductOptionsForEdit = async (): Promise<string[]> => {
    const cached = (window as any)._cachedProducts as string[] | undefined;
    if (cached && cached.length > 0) return cached;
    try {
        const res = await fetch('/api/products?pagination[pageSize]=100&fields[0]=title');
        if (!res.ok) return [];
        const data = await res.json();
        const items: any[] = data.data || [];
        const products = items.map((item: any) => (item.title || '').trim()).filter(Boolean);
        (window as any)._cachedProducts = products;
        return products;
    } catch {
        return [];
    }
};

// ─── Force-enable Strapi's Save button ───────────────────────────────────────

const forceEnableSaveButton = () => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
    const saveBtn = buttons.find(
        b => (b.textContent || '').trim().toLowerCase() === 'save' && !b.closest('nav, aside')
    );
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.removeAttribute('disabled');
        saveBtn.removeAttribute('aria-disabled');
    }
};

// ─── Product field injection ──────────────────────────────────────────────────

let _editInnerObserver: MutationObserver | null = null;

const injectProductFieldOnEditPage = async (
    adminId: string,
    commonHeaders: Record<string, string>
) => {
    if (document.getElementById(EDIT_PRODUCT_ID)) return;

    // Anchor: find the "Roles" section card and inject AFTER it.
    // The edit form has two section cards:
    //   1. "User details"  (first name, password, etc.)
    //   2. "Roles"         (user's roles combobox)  ← we inject after this
    //
    // Strategy: find "A user can have one or several roles" hint text (unique to
    // the Roles section) then walk up until we reach the section-card level where
    // the parent has 2+ sibling section cards.
    const main = document.querySelector<HTMLElement>('main') ?? document.body;

    // Primary anchor: find the hint text unique to the Roles section
    let sectionCard: HTMLElement | null = null;
    const allLeaves = Array.from(main.querySelectorAll<HTMLElement>('*')).filter(
        el => el.querySelectorAll('*').length === 0
    );
    const hintEl = allLeaves.find(
        el => (el.textContent || '').trim() === 'A user can have one or several roles'
    );

    if (hintEl) {
        let el: HTMLElement = hintEl;
        for (let i = 0; i < 12 && el.parentElement && el.parentElement !== main; i++) {
            el = el.parentElement;
            if (el.parentElement && el.parentElement.children.length >= 2) {
                sectionCard = el;
                break;
            }
        }
    }

    // Fallback: find combobox → walk up until parent has 2+ section siblings
    if (!sectionCard) {
        const combobox = main.querySelector<HTMLElement>('[role="combobox"]');
        if (!combobox) return; // form not rendered yet — caller will retry
        let el: HTMLElement = combobox;
        for (let i = 0; i < 12 && el.parentElement && el.parentElement !== main; i++) {
            el = el.parentElement;
            if (el.parentElement && el.parentElement.children.length >= 2 && i >= 2) {
                sectionCard = el;
                break;
            }
        }
    }

    if (!sectionCard) return; // could not locate Roles section card — retry later

    // ── Build wrapper ──────────────────────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.id = EDIT_PRODUCT_ID;
    Object.assign(wrapper.style, {
        display: 'none', // hidden until Staff role detected
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '16px',
    });

    const label = document.createElement('label');
    label.setAttribute('for', `${EDIT_PRODUCT_ID}-select`);
    label.textContent = 'Product *';
    Object.assign(label.style, {
        fontSize: '12px',
        fontWeight: '600',
        color: '#32324d',
        fontFamily: 'inherit',
    });

    const hint = document.createElement('span');
    hint.textContent = 'Which product does this staff member handle?';
    Object.assign(hint.style, { fontSize: '11px', color: '#8e8ea9' });

    const select = document.createElement('select');
    select.id = `${EDIT_PRODUCT_ID}-select`;
    Object.assign(select.style, {
        height: '40px',
        padding: '0 12px',
        border: '1px solid #dcdce4',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#32324d',
        background: '#fff',
        outline: 'none',
        width: '100%',
        cursor: 'pointer',
    });

    const loadingOpt = document.createElement('option');
    loadingOpt.value = '';
    loadingOpt.textContent = 'Loading…';
    select.appendChild(loadingOpt);

    select.addEventListener('change', () => {
        (window as any)._pendingEditProduct = select.value;
        (window as any)._editProductDirty = true;
        forceEnableSaveButton();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(hint);
    wrapper.appendChild(select);
    sectionCard.insertAdjacentElement('afterend', wrapper);

    // ── Watch for role changes and toggle visibility ───────────────────────
    _editInnerObserver?.disconnect();
    _editInnerObserver = new MutationObserver(() => {
        const w = document.getElementById(EDIT_PRODUCT_ID);
        if (!w) { _editInnerObserver?.disconnect(); return; }
        const show = isStaffRoleOnEditPage();
        w.style.display = show ? 'flex' : 'none';
        if (!show) {
            const sel = w.querySelector<HTMLSelectElement>('select');
            if (sel) sel.value = '';
            (window as any)._pendingEditProduct = undefined; // undefined = skip save
            (window as any)._editProductDirty = false;
        }
        // If product was changed, keep re-enabling the save button whenever
        // Strapi's React re-render tries to disable it.
        if ((window as any)._editProductDirty) forceEnableSaveButton();
    });
    _editInnerObserver.observe(document.body, { childList: true, subtree: true });

    // ── Fetch products + existing mapping in parallel ─────────────────────
    const [products, existing] = await Promise.all([
        fetchProductOptionsForEdit(),
        fetchExistingProductMapping(adminId, commonHeaders),
    ]);

    if (!document.getElementById(EDIT_PRODUCT_ID)) return; // navigated away mid-fetch

    // Store for fetchInterceptor to use on PUT /admin/users/:id
    (window as any)._editProductDocumentId = existing?.documentId ?? null;
    (window as any)._editProductAdminId = adminId;
    (window as any)._pendingEditProduct = existing?.product ?? undefined;

    // Populate options
    while (select.options.length > 0) select.remove(0);
    const blankOpt = document.createElement('option');
    blankOpt.value = '';
    blankOpt.textContent = products.length ? '— Select product —' : 'No products found';
    select.appendChild(blankOpt);
    products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
    if (existing?.product) select.value = existing.product;

    // Initial visibility
    const show = isStaffRoleOnEditPage();
    wrapper.style.display = show ? 'flex' : 'none';
    if (!show) (window as any)._pendingEditProduct = undefined;
};

// ─── Password pre-fill ────────────────────────────────────────────────────────

const prefillPassword = async (adminId: string, commonHeaders: Record<string, string>) => {
    try {
        const res = await fetch(
            `/content-manager/collection-types/api::advisor.advisor?filters[id][$eq]=${adminId}`,
            { headers: commonHeaders }
        );
        if (!res.ok) return;
        const data = await res.json();
        const advisorData = (data.results || data.data || [])[0];
        if (!advisorData) return;

        const pass = advisorData.password || advisorData.attributes?.password;
        if (!pass) return;

        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const passInputs = Array.from(document.querySelectorAll('input')).filter(
                (i) =>
                    i.type === 'password' ||
                    i.name?.toLowerCase().includes('password') ||
                    i.id?.toLowerCase().includes('password')
            );

            if (passInputs.length >= 2) {
                passInputs.forEach((input) => {
                    if (input.value !== pass) {
                        input.value = pass;
                        input.type = 'text';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
                if (attempts > 50) clearInterval(interval);
            }
            if (attempts > 150) clearInterval(interval);
        }, 500);
    } catch (e) {
        console.error('[Admin Pass Override]', e);
    }
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const applyAdminUserOverride = (commonHeaders: Record<string, string>) => {
    const match = window.location.pathname.match(/\/admin\/settings\/users\/(\d+)/);
    if (!match) {
        (window as any)._admin_user_pass_loaded = false;
        // Cleanup product state when leaving the edit page
        _editInnerObserver?.disconnect();
        _editInnerObserver = null;
        (window as any)._pendingEditProduct = undefined;
        (window as any)._editProductDocumentId = undefined;
        (window as any)._editProductAdminId = undefined;
        (window as any)._editProductDirty = false;
        return;
    }

    const adminId = match[1];

    // Password prefill — run once per user
    if (
        !(window as any)._admin_user_pass_loaded ||
        (window as any)._current_admin_edit_id !== adminId
    ) {
        (window as any)._admin_user_pass_loaded = true;
        (window as any)._current_admin_edit_id = adminId;
        prefillPassword(adminId, commonHeaders);
    }

    // Product field — always attempt; has internal getElementById guard so it
    // only injects once, but keeps retrying until the form DOM is ready.
    injectProductFieldOnEditPage(adminId, commonHeaders);
};
