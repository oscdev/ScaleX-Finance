export const applyNavOverride = () => {
    const navLinks = Array.from(document.querySelectorAll('nav a'));
    // Select the Leads link more carefully
    const leadsLink = navLinks.find((a) => {
        const href = a.getAttribute('href') || '';
        return href.includes('api::lead.lead') && !a.id.includes('custom');
    });
    
    const loanAppLinks = navLinks.filter((a) =>
        a.getAttribute('href')?.includes('loan-application')
    );

    loanAppLinks.forEach((link) => {
        (link as HTMLElement).style.display = 'none';
    });

    if (leadsLink && !document.getElementById('custom-add-lead-li')) {
        const listItem = leadsLink.closest('li');
        if (listItem && listItem.parentElement) {
            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            
            const originalLiClasses = listItem.className || '';
            const startExpanded = sessionStorage.getItem('leads-menu-expanded') !== 'false';
            const isOverviewActive = 
                currentPath.includes('api::lead.lead') || 
                currentPath.includes('api::loan-application.loan-application');
            
            const isAddLeadActive =
                currentPath === '/products' ||
                (currentPath.includes('api::lead.lead') && currentSearch.includes('create'));

            // FIX: Ensure parent text exists (sometimes lost in production builds)
            const textSpan = (leadsLink as HTMLElement).querySelector('span');
            if (textSpan) {
                textSpan.textContent = 'Leads';
                textSpan.style.color = 'inherit';
            } else if (!(leadsLink as HTMLElement).textContent?.trim()) {
                (leadsLink as HTMLElement).innerHTML = `<span style="color:inherit; font-weight:500; font-size:13px; margin-left: 8px;">Leads</span>`;
            }

            // Standardize parent link style
            (leadsLink as HTMLElement).style.display = 'flex';
            (leadsLink as HTMLElement).style.alignItems = 'center';
            (leadsLink as HTMLElement).style.padding = '8px 12px';
            (leadsLink as HTMLElement).style.textDecoration = 'none';
            (leadsLink as HTMLElement).style.borderRadius = '4px';

            // "Add New Lead" child item
            const addLeadLi = document.createElement('li');
            addLeadLi.id = 'custom-add-lead-li';
            addLeadLi.className = `${originalLiClasses} leads-submenu-item`;
            Object.assign(addLeadLi.style, {
                listStyle: 'none',
                margin: '0',
                padding: '0',
                display: startExpanded ? 'block' : 'none'
            });
            addLeadLi.innerHTML = `
                <a id="custom-add-lead-link" href="/products" title="Add New Lead"
                   style="display:block; padding: 10px 16px 10px 32px; color: ${isAddLeadActive ? '#ffffff' : '#32324d'} !important; background-color: ${isAddLeadActive ? '#1d4ed8' : 'transparent'} !important; text-decoration: none; font-size: 13px; font-weight: 500; border-radius: 4px; margin: 2px 0;">
                    Add New Lead
                </a>
            `;

            // "Leads Overview" child item
            const overviewLi = document.createElement('li');
            overviewLi.id = 'custom-my-leads-li';
            overviewLi.className = `${originalLiClasses} leads-submenu-item`;
            Object.assign(overviewLi.style, {
                listStyle: 'none',
                margin: '0',
                padding: '0',
                display: startExpanded ? 'block' : 'none'
            });
            overviewLi.innerHTML = `
                <a id="custom-my-leads-link" href="/admin/content-manager/collection-types/api::lead.lead" title="Leads Overview"
                   style="display:block; padding: 10px 16px 10px 32px; color: ${isOverviewActive ? '#ffffff' : '#32324d'} !important; background-color: ${isOverviewActive ? '#1d4ed8' : 'transparent'} !important; text-decoration: none; font-size: 13px; font-weight: 500; border-radius: 4px; margin: 2px 0;">
                    Leads Overview
                </a>
            `;

            if (isAddLeadActive || isOverviewActive) {
                (leadsLink as HTMLElement).style.backgroundColor = '#1d4ed8';
                (leadsLink as HTMLElement).style.color = '#ffffff';
            }

            listItem.insertAdjacentElement('afterend', overviewLi);
            listItem.insertAdjacentElement('afterend', addLeadLi);

            // Chevron toggle
            listItem.style.position = 'relative';
            const chevron = document.createElement('button');
            chevron.id = 'leads-chevron-toggle';
            chevron.type = 'button';
            Object.assign(chevron.style, {
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: (isAddLeadActive || isOverviewActive) ? '#ffffff' : '#32324d',
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: '20'
            });
            chevron.innerHTML = `<svg width="14" height="14" style="transition:transform 0.2s;transform:rotate(${startExpanded ? '180deg' : '0deg'});"><polyline points="3 5 7 9 11 5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
            listItem.appendChild(chevron);

            const toggleChildren = () => {
                const nowExpanded = addLeadLi.style.display === 'none';
                addLeadLi.style.display = nowExpanded ? 'block' : 'none';
                overviewLi.style.display = nowExpanded ? 'block' : 'none';
                sessionStorage.setItem('leads-menu-expanded', nowExpanded ? 'true' : 'false');
                const svg = chevron.querySelector('svg') as SVGElement | null;
                if (svg) svg.style.transform = `rotate(${nowExpanded ? '180deg' : '0deg'})`;
            };

            chevron.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleChildren();
            };

            (leadsLink as HTMLElement).addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleChildren();
            }, true);

            // Client-side navigation handlers
            const addBtn = addLeadLi.querySelector('#custom-add-lead-link') as HTMLAnchorElement | null;
            if (addBtn) addBtn.onclick = (e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/products');
                window.dispatchEvent(new PopStateEvent('popstate'));
                setTimeout(updateNavActiveStates, 50);
            };

            const ovBtn = overviewLi.querySelector('#custom-my-leads-link') as HTMLAnchorElement | null;
            if (ovBtn) ovBtn.onclick = (e) => {
                e.preventDefault();
                window.history.pushState(null, '', '/admin/content-manager/collection-types/api::lead.lead');
                window.dispatchEvent(new PopStateEvent('popstate'));
                setTimeout(updateNavActiveStates, 50);
            };
        }
    }
};

const setLinkActive = (el: HTMLElement, active: boolean) => {
    el.style.setProperty('background-color', active ? '#1d4ed8' : 'transparent', 'important');
    el.style.setProperty('color', active ? '#ffffff' : '#32324d', 'important');
};

export const updateNavActiveStates = () => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const isAddLeadActive = currentPath === '/products' || (currentPath.includes('api::lead.lead') && currentSearch.includes('create'));
    const isOverviewActive = currentPath.includes('api::lead.lead') && !currentSearch.includes('create');

    const addLink = document.getElementById('custom-add-lead-link') as HTMLElement | null;
    const ovLink = document.getElementById('custom-my-leads-link') as HTMLElement | null;
    const leadsP = document.querySelector('nav a[href*="api::lead.lead"]:not([id*="custom"])') as HTMLElement | null;
    const chevron = document.getElementById('leads-chevron-toggle') as HTMLElement | null;

    if (addLink) setLinkActive(addLink, isAddLeadActive);
    if (ovLink) setLinkActive(ovLink, isOverviewActive);
    if (leadsP) {
        const isActive = isAddLeadActive || isOverviewActive;
        leadsP.style.setProperty('background-color', isActive ? '#1d4ed8' : 'transparent', 'important');
        leadsP.style.setProperty('color', isActive ? '#ffffff' : '#32324d', 'important');
        if (chevron) chevron.style.color = isActive ? '#ffffff' : '#32324d';
    }
};
