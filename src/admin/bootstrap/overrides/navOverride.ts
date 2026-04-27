export const applyNavOverride = () => {
    const navLinks = Array.from(document.querySelectorAll('nav a'));
    const leadsLink = navLinks.find((a) => a.getAttribute('href')?.endsWith('api::lead.lead'));
    const loanAppLink = navLinks.find((a) =>
        a.getAttribute('href')?.endsWith('api::loan-application.loan-application')
    );

    if (loanAppLink) {
        (loanAppLink as HTMLElement).style.display = 'none';
        loanAppLink.id = 'original-loan-apps-link';
    }

    if (leadsLink && !document.getElementById('custom-add-lead-li')) {
        const listItem = leadsLink.closest('li');
        if (listItem && listItem.parentElement) {
            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            const isLeadsActive =
                currentPath.includes('api::lead.lead') ||
                currentPath.includes('api::loan-application.loan-application');
            const originalLiClasses = listItem.className || '';
            const startExpanded =
                isLeadsActive && sessionStorage.getItem('leads-menu-expanded') !== 'false';
            const isOverviewActive = currentPath.includes('api::lead.lead');
            const isAddLeadActive =
                currentPath === '/products' ||
                (currentPath.includes('api::lead.lead') && currentSearch.includes('create'));

            // "Add New Lead" child item
            const addLeadLi = document.createElement('li');
            addLeadLi.id = 'custom-add-lead-li';
            addLeadLi.className = `${originalLiClasses} leads-submenu-item`;
            addLeadLi.setAttribute('data-lead-child', 'true');
            if (!startExpanded) addLeadLi.style.display = 'none';
            addLeadLi.innerHTML = `
                <a id="custom-add-lead-link" href="/products" title="Add New Lead"
                   class="leads-submenu-link${isAddLeadActive ? ' active' : ''}">
                    Add New Lead
                </a>
            `;

            // "Leads Overview" child item
            const overviewLi = document.createElement('li');
            overviewLi.id = 'custom-my-leads-li';
            overviewLi.className = `${originalLiClasses} leads-submenu-item`;
            overviewLi.setAttribute('data-lead-child', 'true');
            if (!startExpanded) overviewLi.style.display = 'none';
            overviewLi.innerHTML = `
                <a id="custom-my-leads-link" href="/admin/content-manager/collection-types/api::lead.lead" title="Leads Overview"
                   class="leads-submenu-link${isOverviewActive && !isAddLeadActive ? ' active' : ''}">
                    Leads Overview
                </a>
            `;

            if (isAddLeadActive || isOverviewActive) {
                (leadsLink as HTMLElement).classList.add('active');
            }

            listItem.insertAdjacentElement('afterend', overviewLi);
            listItem.insertAdjacentElement('afterend', addLeadLi);

            // Parent li — CSS class handles position:relative
            listItem.classList.add('leads-parent-nav-item');

            // Chevron toggle — CSS handles all static positioning/sizing
            const chevron = document.createElement('button');
            chevron.id = 'leads-chevron-toggle';
            chevron.type = 'button';
            chevron.setAttribute('aria-label', 'Toggle leads submenu');
            chevron.innerHTML = `<svg width="10" height="10" style="transition:transform 0.2s;transform:rotate(${startExpanded ? '180deg' : '0deg'});"><polyline points="1 3 5 7 9 3" stroke="currentColor" fill="none" stroke-width="2"></polyline></svg>`;
            listItem.appendChild(chevron);

            const toggleChildren = () => {
                const nowExpanded = addLeadLi.style.display === 'none';
                addLeadLi.style.display = nowExpanded ? '' : 'none';
                overviewLi.style.display = nowExpanded ? '' : 'none';
                sessionStorage.setItem('leads-menu-expanded', nowExpanded ? 'true' : 'false');
                const svg = chevron.querySelector('svg') as SVGElement | null;
                if (svg) svg.style.transform = `rotate(${nowExpanded ? '180deg' : '0deg'})`;
            };

            chevron.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleChildren();
            };

            // Parent "Leads" link only toggles the submenu — no navigation
            (leadsLink as HTMLElement).addEventListener(
                'click',
                (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleChildren();
                },
                true
            );

            const addLeadBtn = addLeadLi.querySelector('#custom-add-lead-link') as HTMLAnchorElement | null;
            if (addLeadBtn) {
                addLeadBtn.onclick = (e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/products');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                };
            }

            const myLeadsBtn = overviewLi.querySelector('#custom-my-leads-link') as HTMLAnchorElement | null;
            if (myLeadsBtn) {
                myLeadsBtn.onclick = (e) => {
                    e.preventDefault();
                    const original = document.getElementById('original-leads-link');
                    if (original) {
                        (original as HTMLElement).click();
                    } else {
                        window.history.pushState(
                            null,
                            '',
                            '/admin/content-manager/collection-types/api::lead.lead'
                        );
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                };
            }
        }
    }
};

export const updateNavActiveStates = () => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const isAddLeadActive =
        currentPath === '/products' ||
        (currentPath.includes('api::lead.lead') && currentSearch.includes('create'));
    const isOverviewActive = currentPath.includes('api::lead.lead') && !currentSearch.includes('create');

    const addLeadLink = document.getElementById('custom-add-lead-link');
    const overviewLink = document.getElementById('custom-my-leads-link');
    const leadsParent = document.querySelector('nav a[href*="api::lead.lead"]');

    if (addLeadLink) addLeadLink.classList.toggle('active', isAddLeadActive);
    if (overviewLink) overviewLink.classList.toggle('active', isOverviewActive);
    if (leadsParent) leadsParent.classList.toggle('active', isAddLeadActive || isOverviewActive);
};
