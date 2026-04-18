export const registerClickHandlers = () => {
    window.addEventListener(
        'click',
        (e) => {
            const target = e.target as HTMLElement;
            if (target && target.id === 'custom-partner-link') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.location.href = '/advisor-onboarding';
            }
            if (target && target.id === 'custom-add-lead-link') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.location.href = '/products';
            }

            if (
                target &&
                (target.id === 'custom-my-leads-link' || target.closest('#custom-my-leads-link'))
            ) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const originalLink = document.getElementById(
                    'original-leads-link'
                ) as HTMLElement | null;
                if (originalLink) {
                    originalLink.click();
                }
            }

            if (
                target &&
                (target.id === 'custom-loan-apps-link' || target.closest('#custom-loan-apps-link'))
            ) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const originalLink = document.getElementById(
                    'original-loan-apps-link'
                ) as HTMLElement | null;
                if (originalLink) {
                    originalLink.click();
                }
            }

            const leadRow = target.closest('tr');
            if (
                leadRow &&
                (leadRow.querySelector('.custom-ai-match') || leadRow.querySelector('.custom-view-lead'))
            ) {
                const isCustomBtn =
                    target.closest('.custom-ai-match') || target.closest('.custom-view-lead');
                if (!isCustomBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }

            if (target && target.closest('#leads-toggle')) {
                e.preventDefault();
                e.stopPropagation();
                const subMenu = document.getElementById(
                    'advisor-leads-submenu'
                ) as HTMLElement | null;
                if (subMenu) {
                    const isHidden = subMenu.style.display === 'none';
                    const newState = isHidden ? 'flex' : 'none';
                    subMenu.style.display = newState;
                    sessionStorage.setItem('leads-menu-expanded', isHidden ? 'true' : 'false');

                    const arrow = document.getElementById(
                        'leads-toggle-arrow'
                    ) as HTMLElement | null;
                    if (arrow) {
                        arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                }
            }
        },
        true
    );
};
