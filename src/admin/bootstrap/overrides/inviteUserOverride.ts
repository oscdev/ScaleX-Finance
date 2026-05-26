// Injects a "Product" dropdown into Strapi's "Invite new user" modal.
// The field is hidden until the "Staff" or "Banker" role is selected in the roles combobox.
// Options are fetched live from /api/products (the products table).
// The selected value is stored on window._pendingInviteProduct.
// fetchInterceptor.ts reads it after POST /admin/users succeeds and
// saves it to /api/user-product-mappings.

const INJECT_ID = 'scalex-invite-product-field';

// ─── Fetch products from API ──────────────────────────────────────────────────

let _cachedProducts: string[] = [];

const fetchProducts = async (): Promise<string[]> => {
    if (_cachedProducts.length > 0) return _cachedProducts;
    try {
        // api::product.product.find is public — no auth token required
        const res = await fetch('/api/products?pagination[pageSize]=100&fields[0]=title');
        if (!res.ok) return [];
        const data = await res.json();
        const items: any[] = data.data || [];
        // Strapi v5 returns flat objects (no .attributes wrapper)
        _cachedProducts = items
            .map((item: any) => (item.title || '').trim())
            .filter(Boolean);
        return _cachedProducts;
    } catch {
        return [];
    }
};

// ─── Modal detection ──────────────────────────────────────────────────────────

const findInviteModal = (): HTMLElement | null => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))) {
        if ((el.textContent || '').toLowerCase().includes('invite')) return el;
    }
    return null;
};

// ─── Role detection ───────────────────────────────────────────────────────────
// Strapi renders selected role chips inline in the combobox.
// Unselected options only appear inside [role="listbox"] (the open dropdown).
// We look for a leaf element with text "staff" or "banker" that is NOT inside a listbox.

const isStaffOrBankerRoleSelected = (modal: HTMLElement): boolean => {
    const inListbox = (el: Element) => !!el.closest('[role="listbox"]');
    // Exclude our own injected field to avoid false positives.
    const inOurField = (el: Element) => !!el.closest(`#${INJECT_ID}`);

    return Array.from(modal.querySelectorAll<HTMLElement>('span, div'))
        .filter(el => !inListbox(el) && !inOurField(el))
        .some(el => {
            // Chip labels have no child spans/divs (leaf-like nodes)
            const hasNoComplexChildren = el.querySelectorAll('span, div').length === 0;
            const text = (el.textContent || '').trim().toLowerCase();
            return hasNoComplexChildren && (text.includes('staff') || text.includes('banker'));
        });
};

// ─── Inner observer (per modal) ───────────────────────────────────────────────
// Watches the modal's DOM and toggles the product field visibility when the
// selected role changes. Disconnected when the modal closes.

let _innerObserver: MutationObserver | null = null;

const startInnerObserver = (modal: HTMLElement) => {
    _innerObserver?.disconnect();
    _innerObserver = new MutationObserver(() => {
        if (!modal.isConnected) {
            _innerObserver?.disconnect();
            _innerObserver = null;
            return;
        }
        const wrapper = modal.querySelector<HTMLElement>(`#${INJECT_ID}`);
        if (!wrapper) return;

        const show = isStaffOrBankerRoleSelected(modal);
        wrapper.style.display = show ? 'flex' : 'none';

        if (!show) {
            // Reset product selection when the field is hidden
            const sel = wrapper.querySelector<HTMLSelectElement>('select');
            if (sel) sel.value = '';
            (window as any)._pendingInviteProduct = '';
        }
    });
    _innerObserver.observe(modal, { childList: true, subtree: true });
};

// ─── Injection ────────────────────────────────────────────────────────────────

const buildSelect = (products: string[]): HTMLSelectElement => {
    const select = document.createElement('select');
    select.id = `${INJECT_ID}-select`;
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

    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = products.length ? '— Select product —' : 'Loading…';
    select.appendChild(blank);

    products.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => {
        (window as any)._pendingInviteProduct = select.value || '';
    });

    return select;
};

const injectProductField = async (modal: HTMLElement) => {
    if (modal.querySelector(`#${INJECT_ID}`)) return; // already injected

    // Find the footer (contains Send/Cancel buttons) — inject our field just before it.
    const footer = modal.querySelector<HTMLElement>('footer, [role="group"]') ??
        Array.from(modal.querySelectorAll<HTMLElement>('div')).find((d) => {
            const btns = d.querySelectorAll('button');
            return btns.length >= 2 && Array.from(btns).some((b) =>
                (b.textContent || '').toLowerCase().includes('invitation') ||
                (b.textContent || '').toLowerCase().includes('send')
            );
        }) ?? null;

    const wrapper = document.createElement('div');
    wrapper.id = INJECT_ID;
    Object.assign(wrapper.style, {
        padding: '0 24px 16px',
        display: 'none', // hidden until Staff role is selected
        flexDirection: 'column',
        gap: '6px',
    });

    const label = document.createElement('label');
    label.setAttribute('for', `${INJECT_ID}-select`);
    label.textContent = 'Product *';
    Object.assign(label.style, {
        fontSize: '12px',
        fontWeight: '600',
        color: '#32324d',
        fontFamily: 'inherit',
    });

    const hint = document.createElement('span');
    hint.textContent = 'Which product does this user handle?';
    Object.assign(hint.style, {
        fontSize: '11px',
        color: '#8e8ea9',
        marginTop: '-4px',
    });

    // Show a loading placeholder immediately, then swap in real options
    const select = buildSelect([]);
    wrapper.appendChild(label);
    wrapper.appendChild(hint);
    wrapper.appendChild(select);

    if (footer) {
        footer.insertAdjacentElement('beforebegin', wrapper);
    } else {
        modal.appendChild(wrapper);
    }

    // Reset pending value whenever this modal appears fresh
    (window as any)._pendingInviteProduct = '';

    // Watch the modal for role-selection changes and toggle visibility
    startInnerObserver(modal);

    // Fetch products and populate the select
    const products = await fetchProducts();
    if (!modal.isConnected) return; // modal closed while fetching
    const existingSelect = wrapper.querySelector<HTMLSelectElement>('select');
    if (!existingSelect) return;

    // Rebuild options in place
    while (existingSelect.options.length > 0) existingSelect.remove(0);
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = products.length ? '— Select product —' : 'No products found';
    existingSelect.appendChild(blank);
    products.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        existingSelect.appendChild(opt);
    });
};

// ─── Cleanup when modal closes ────────────────────────────────────────────────

const cleanupIfModalGone = () => {
    if (!findInviteModal()) {
        (window as any)._pendingInviteProduct = '';
        _innerObserver?.disconnect();
        _innerObserver = null;
    }
};

// ─── MutationObserver — watches for modal open/close ─────────────────────────

let _observer: MutationObserver | null = null;

export const startInviteUserOverride = () => {
    if (_observer) return;

    _observer = new MutationObserver(() => {
        const modal = findInviteModal();
        if (modal) {
            injectProductField(modal);
        } else {
            cleanupIfModalGone();
        }
    });

    _observer.observe(document.body, { childList: true, subtree: true });
};
