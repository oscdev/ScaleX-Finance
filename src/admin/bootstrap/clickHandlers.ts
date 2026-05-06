export const registerClickHandlers = () => {
    window.addEventListener(
        'click',
        (e) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // 1. Handle custom links
            if (target.id === 'custom-partner-link') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.location.href = '/advisor-onboarding';
            }

            // 2. Block row navigation for Advisor and Lead list pages
            const path = window.location.pathname;
            const isGuardedPage = path.includes('api::advisor.advisor') || path.includes('api::lead.lead');
            
            if (isGuardedPage) {
                const row = target.closest('tr');
                const isBodyRow = row && row.closest('tbody');
                
                if (isBodyRow) {
                    // 1. COMPLETELY EXEMPT the checkbox cell (first column)
                    if (target.closest('td:first-child')) {
                        return; // Let Strapi handle the checkbox cell natively
                    }

                    // 2. Identify interactive elements in other cells
                    const isViewBtn = target.closest('.adv-view-btn') || target.closest('.custom-view-lead');
                    const isInteractive = 
                        target.closest('button') || 
                        target.closest('a') || 
                        target.closest('input') || 
                        target.closest('label');

                    if (!isInteractive) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return;
                    }

                    // 3. For non-view interactive elements (icons), block bubbling
                    if (!isViewBtn) {
                        target.addEventListener('click', (ev) => ev.stopPropagation(), { once: true });
                    }
                }
            }

            // 4. Handle leads menu toggle
            if (target.closest('#leads-toggle')) {
                e.preventDefault();
                e.stopPropagation();
                const subMenu = document.getElementById(
                    'advisor-leads-submenu'
                ) as HTMLElement | null;
                if (subMenu) {
                    const willExpand = !subMenu.classList.contains('is-expanded');
                    subMenu.classList.toggle('is-expanded', willExpand);
                    sessionStorage.setItem('leads-menu-expanded', willExpand ? 'true' : 'false');

                    const arrow = document.getElementById(
                        'leads-toggle-arrow'
                    ) as HTMLElement | null;
                    if (arrow) {
                        arrow.style.transform = willExpand ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                }
            }
        },
        true
    );
};
