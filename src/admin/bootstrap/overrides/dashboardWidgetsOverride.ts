/**
 * Homepage (/admin): gate Strapi widgets + Add Widget via Custom Actions
 * `dashboardWidgets: { show }` → window._dashboardWidgetsAllowed.
 */

const HIDDEN_ATTR = 'data-scalex-widgets-hidden';

const isHomepagePath = (): boolean => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/admin';
};

const isAllowed = (): boolean => (window as any)._dashboardWidgetsAllowed === true;

const hideEl = (el: HTMLElement) => {
    if (el.getAttribute(HIDDEN_ATTR) === '1') return;
    el.setAttribute(HIDDEN_ATTR, '1');
    el.style.setProperty('display', 'none', 'important');
};

const restoreEl = (el: HTMLElement) => {
    if (el.getAttribute(HIDDEN_ATTR) !== '1') return;
    el.removeAttribute(HIDDEN_ATTR);
    el.style.removeProperty('display');
};

const restoreAllHidden = () => {
    document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}="1"]`).forEach(restoreEl);
};

const buttonLooksLikeAddWidget = (el: HTMLElement): boolean => {
    const label = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.trim().toLowerCase();
    return label.includes('add widget');
};

const hideAddWidgetControls = () => {
    const candidates = document.querySelectorAll<HTMLElement>('button, a[role="button"], [role="button"]');
    for (const el of Array.from(candidates)) {
        if (buttonLooksLikeAddWidget(el)) hideEl(el);
    }
};

const hideWidgetSurface = () => {
    document
        .querySelectorAll<HTMLElement>('[data-strapi-widget-id], [data-strapi-grid-container]')
        .forEach(hideEl);
};

const hideAddWidgetModal = () => {
    const titles = document.querySelectorAll<HTMLElement>(
        '[role="dialog"] h2, [role="dialog"] [id*="title"], [data-strapi-modal-title]'
    );
    for (const title of Array.from(titles)) {
        const text = (title.textContent || '').trim().toLowerCase();
        if (text !== 'add widget') continue;
        const dialog = title.closest<HTMLElement>('[role="dialog"]');
        if (dialog) {
            hideEl(dialog);
            const overlay = dialog.parentElement;
            if (overlay && overlay !== document.body) hideEl(overlay);
        }
    }
};

export const applyDashboardWidgetsOverride = (): void => {
    if (!isHomepagePath()) {
        // Leaving homepage — restore so other routes are unaffected
        restoreAllHidden();
        return;
    }

    if (isAllowed()) {
        restoreAllHidden();
        return;
    }

    hideAddWidgetControls();
    hideWidgetSurface();
    hideAddWidgetModal();
};
