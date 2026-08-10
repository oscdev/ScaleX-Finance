/** Active CM nav look — matches Leads Overview (solid blue + white bold). */
const ACTIVE_BG = '#1d4ed8';
const ACTIVE_FG = '#ffffff';
const IDLE_FG = '#0f172a';

const paintActive = (el: HTMLElement | null, active: boolean) => {
    if (!el) return;
    el.classList.toggle('is-nav-active', active);
    el.style.setProperty('background-color', active ? ACTIVE_BG : 'transparent', 'important');
    el.style.setProperty('background', active ? ACTIVE_BG : 'transparent', 'important');
    el.style.setProperty('color', active ? ACTIVE_FG : IDLE_FG, 'important');
    el.style.setProperty('font-weight', active ? '700' : '600', 'important');
    el.style.borderRadius = '4px';
    el.style.setProperty('box-shadow', 'none', 'important');
    el.querySelectorAll<HTMLElement>('*').forEach((child) => {
        child.style.setProperty('color', active ? ACTIVE_FG : '', 'important');
        child.style.setProperty('stroke', active ? ACTIVE_FG : '', 'important');
        child.style.setProperty('fill', active ? ACTIVE_FG : '', 'important');
        if (active) {
            child.style.setProperty('font-weight', '700', 'important');
            child.style.setProperty('background-color', 'transparent', 'important');
            child.style.setProperty('background', 'transparent', 'important');
        }
    });

    // Strapi often paints primary100 on the parent li — override that too
    const li = el.closest('li');
    if (li) {
        li.classList.toggle('is-nav-active-parent', active);
        li.style.setProperty('background-color', active ? ACTIVE_BG : 'transparent', 'important');
        li.style.setProperty('background', active ? ACTIVE_BG : 'transparent', 'important');
        li.style.setProperty('box-shadow', 'none', 'important');
        if (active) li.style.borderRadius = '4px';
    }
};

const hrefMatchesPath = (href: string, path: string): boolean => {
    if (!href || href === '#' || href.startsWith('javascript:')) return false;
    try {
        const u = new URL(href, window.location.origin);
        // Exact collection/single-type match (avoid parent path prefixing wrong items)
        if (u.pathname === path) return true;
        // Detail routes: .../api::x.x/<id>
        if (path.startsWith(u.pathname + '/')) return true;
        return false;
    } catch {
        return false;
    }
};

/**
 * Paint every Content Manager Collection Types / Single Types link
 * (parent + child) so selected = Leads Overview style.
 */
export const syncContentManagerNavStyles = () => {
    const path = window.location.pathname;
    const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
            'nav a[href*="content-manager"], aside a[href*="content-manager"]'
        )
    );

    for (const a of links) {
        const href = a.getAttribute('href') || '';
        // Loan application is hidden; skip
        if (href.includes('loan-application')) continue;
        const active = hrefMatchesPath(href, path);
        paintActive(a, active);

        const li = a.closest('li');
        if (li) {
            li.classList.toggle('is-nav-active-parent', active);
        }
    }

    // Custom Leads Overview / parent Leads (href stripped — handle separately)
    const isLeadList =
        path.includes('/content-manager/collection-types/api::lead.lead') &&
        !path.match(/api::lead\.lead\/[^/]+/);

    const overview = document.getElementById('custom-leads-overview-link') as HTMLElement | null;
    paintActive(overview, isLeadList || path.includes('api::lead.lead'));

    // Parent "Leads" toggle (href removed) — same solid active look when on lead routes
    const leadsParent = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('nav a, aside a')
    ).find((a) => {
        if (a.id?.includes('custom')) return false;
        const href = a.getAttribute('href') || '';
        // After override, href may be empty; match by label text
        const text = (a.textContent || '').trim().toLowerCase();
        return text === 'leads' || href.includes('api::lead.lead');
    });
    if (leadsParent) {
        const onLeads = path.includes('api::lead.lead');
        paintActive(leadsParent, onLeads);
        leadsParent.closest('li')?.classList.toggle('is-nav-active-parent', onLeads);
    }

    const addLink = document.getElementById('custom-leads-add-link') as HTMLElement | null;
    paintActive(addLink, false);
};

export const applyNavOverride = () => {
    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav a'));

    // Hide the loan-application nav link (accessed via lead detail dashboard)
    navLinks
        .filter((a) => a.getAttribute('href')?.includes('loan-application'))
        .forEach((link) => {
            (link as HTMLElement).style.display = 'none';
        });

    const leadsLink = navLinks.find((a) => {
        const href = a.getAttribute('href') || '';
        return href.includes('api::lead.lead') && !a.id.includes('custom');
    });

    if (!leadsLink || document.getElementById('custom-leads-add-li')) {
        syncContentManagerNavStyles();
        return;
    }

    const listItem = leadsLink.closest('li');
    if (!listItem?.parentElement) {
        syncContentManagerNavStyles();
        return;
    }

    const isOverviewActive = window.location.pathname.includes('api::lead.lead');
    const expanded = sessionStorage.getItem('leads-nav-expanded') !== 'false';

    const makeChildLi = (
        id: string,
        linkId: string,
        label: string,
        href: string,
        active: boolean,
        onClick: (e: MouseEvent) => void
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
            borderRadius: '4px',
            color: active ? ACTIVE_FG : IDLE_FG,
            fontWeight: active ? '700' : '600',
            backgroundColor: active ? ACTIVE_BG : 'transparent',
        });
        if (active) a.classList.add('is-nav-active');
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
            const url =
                role === 'staff' && adminUserId ? `/products?staffId=${adminUserId}` : '/products';
            window.open(url, '_self');
        }
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
        }
    );

    listItem.insertAdjacentElement('afterend', overviewLi);
    listItem.insertAdjacentElement('afterend', addLeadLi);

    // Remove link behaviour from the Leads parent — it's a toggle only
    leadsLink.removeAttribute('href');
    leadsLink.style.cursor = 'default';
    leadsLink.dataset.scalexLeadsParent = 'true';

    // Toggle children when Leads link is clicked
    leadsLink.addEventListener(
        'click',
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowExpanded = addLeadLi.style.display === 'none';
            addLeadLi.style.display = nowExpanded ? 'block' : 'none';
            overviewLi.style.display = nowExpanded ? 'block' : 'none';
            sessionStorage.setItem('leads-nav-expanded', nowExpanded ? 'true' : 'false');
        },
        true
    );

    // Apply current permission state immediately — the async permission loader
    // may have already resolved _addNewLeadNavAllowed before this element existed.
    updateAddNewLeadNavVisibility();
    syncContentManagerNavStyles();
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
    syncContentManagerNavStyles();
};
