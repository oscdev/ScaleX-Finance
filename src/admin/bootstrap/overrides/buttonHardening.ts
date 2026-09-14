import { shouldPauseAdminOverrides } from '../overlayGuard';

export const applyButtonHardening = () => {
    if (shouldPauseAdminOverrides()) return;

    const pageHeader = document.querySelector('h1')?.textContent || '';
    const shouldHide =
        pageHeader.toLowerCase().includes('lead') ||
        pageHeader.toLowerCase().includes('activity log') ||
        pageHeader.toLowerCase().includes('advisor');

    if (!shouldHide) return;

    document.querySelectorAll('button, a').forEach((el) => {
        const role = el.getAttribute('role') || '';
        const hasPopup = el.getAttribute('aria-haspopup') || '';
        const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
        const text = el.textContent?.toLowerCase() || '';

        // Protect Combobox / listbox triggers only — do NOT skip menu "More actions"
        // (those also have aria-expanded and must stay removable on Lead/Advisor lists).
        const isComboboxOrListbox =
            role === 'combobox' ||
            hasPopup === 'listbox' ||
            !!el.closest('[role="combobox"]') ||
            (el.hasAttribute('aria-expanded') &&
                hasPopup !== 'menu' &&
                !aria.includes('more actions') &&
                text.trim() !== '…' &&
                text.trim() !== '...');

        if (isComboboxOrListbox) return;

        if (
            text.includes('create new entry') ||
            aria.includes('create new entry') ||
            aria.includes('edit') ||
            aria.includes('more actions') ||
            text.trim() === '…' ||
            text.trim() === '...' ||
            (hasPopup === 'menu' &&
                !aria.includes('user') &&
                !aria.includes('account'))
        ) {
            // Never remove items that are our own buttons or inside sidebar/nav
            if (
                !el.classList.contains('custom-action-btn') &&
                !el.closest('nav') &&
                !el.closest('aside') &&
                !el.closest('.custom-actions-cell') &&
                !el.closest('.adv-actions-cell')
            ) {
                el.remove();
            }
        }
    });
};
