export const applyNavOverride = () => {
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav a'));

    // Hide the loan-application nav link (accessed via lead detail dashboard)
    navLinks
        .filter((a) => a.getAttribute('href')?.includes('loan-application'))
        .forEach((link) => { (link as HTMLElement).style.display = 'none'; });

    const leadsLink = navLinks.find((a) => {
        const href = a.getAttribute('href') || '';
        return href.includes('api::lead.lead') && !a.id.includes('custom');
    });

    if (!leadsLink || document.getElementById('custom-leads-add-li')) return;

    const listItem = leadsLink.closest('li');
    if (!listItem?.parentElement) return;

    const isOverviewActive = window.location.pathname.includes('api::lead.lead');
    const expanded = sessionStorage.getItem('leads-nav-expanded') !== 'false';

    const makeChildLi = (
        id: string,
        linkId: string,
        label: string,
        href: string,
        active: boolean,
        onClick: (e: MouseEvent) => void,
    ): HTMLLIElement => {
        const li = document.createElement('li');
        li.id = id;
        li.style.listStyle = 'none';
        li.style.display = expanded ? 'block' : 'none';

        const a = document.createElement('a');
        a.id = linkId;
        a.href = href;
        a.textContent = label;
        Object.assign(a.style, {
            display: 'block',
            padding: '8px 16px 8px 36px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '4px',
            color: active ? '#ffffff' : 'inherit',
            backgroundColor: active ? '#4945ff' : 'transparent',
        });
        a.addEventListener('click', onClick);
        li.appendChild(a);
        return li;
    };

    // "Add New Lead"
    const addLeadLi = makeChildLi(
        'custom-leads-add-li',
        'custom-leads-add-link',
        'Add New Lead',
        '/products',
        false,
        (e) => {
            e.preventDefault();
            const role = sessionStorage.getItem('strapiUserRole');
            const adminUserId = sessionStorage.getItem('strapiAdminUserId');
            const url = (role === 'staff' && adminUserId) ? `/products?staffId=${adminUserId}` : '/products';
            window.open(url, '_self');
        },
    );

    // "Leads Overview"
    const overviewLi = makeChildLi(
        'custom-leads-overview-li',
        'custom-leads-overview-link',
        'Leads Overview',
        '/admin/content-manager/collection-types/api::lead.lead',
        isOverviewActive,
        (e) => {
            e.preventDefault();
            history.pushState(null, '', '/admin/content-manager/collection-types/api::lead.lead');
            window.dispatchEvent(new PopStateEvent('popstate'));
            setTimeout(updateNavActiveStates, 50);
        },
    );

    listItem.insertAdjacentElement('afterend', overviewLi);
    listItem.insertAdjacentElement('afterend', addLeadLi);

    // Remove link behaviour from the Leads parent — it's a toggle only
    leadsLink.removeAttribute('href');
    leadsLink.style.cursor = 'default';

    // Toggle children when Leads link is clicked
    leadsLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowExpanded = addLeadLi.style.display === 'none';
        addLeadLi.style.display = nowExpanded ? 'block' : 'none';
        overviewLi.style.display = nowExpanded ? 'block' : 'none';
        sessionStorage.setItem('leads-nav-expanded', nowExpanded ? 'true' : 'false');
    }, true);

    // Apply current permission state immediately — the async permission loader
    // may have already resolved _addNewLeadNavAllowed before this element existed.
    updateAddNewLeadNavVisibility();
};

export const updateAddNewLeadNavVisibility = () => {
    const li = document.getElementById('custom-leads-add-li') as HTMLElement | null;
    if (!li) return;

    const role = sessionStorage.getItem('strapiUserRole');
    // Super-admin always sees the button
    if (!role || role === 'admin') {
        const expanded = sessionStorage.getItem('leads-nav-expanded') !== 'false';
        li.style.display = expanded ? 'block' : 'none';
        return;
    }

    const allowed = (window as any)._addNewLeadNavAllowed;
    if (allowed === false) {
        li.style.display = 'none';
    } else {
        const expanded = sessionStorage.getItem('leads-nav-expanded') !== 'false';
        li.style.display = expanded ? 'block' : 'none';
    }
};

export const updateNavActiveStates = () => {
    const isOverviewActive = window.location.pathname.includes('api::lead.lead');

    const setActive = (id: string, active: boolean) => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (!el) return;
        el.style.color = active ? '#ffffff' : 'inherit';
        el.style.backgroundColor = active ? '#4945ff' : 'transparent';
    };

    setActive('custom-leads-overview-link', isOverviewActive);
    setActive('custom-leads-add-link', false);
};
