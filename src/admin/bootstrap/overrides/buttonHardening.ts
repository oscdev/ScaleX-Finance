export const applyButtonHardening = () => {
    const pageHeader = document.querySelector('h1')?.textContent || '';
    const shouldHide =
        pageHeader.toLowerCase().includes('lead') ||
        pageHeader.toLowerCase().includes('activity log') ||
        pageHeader.toLowerCase().includes('advisor');

    if (!shouldHide) return;

    document.querySelectorAll('button, a').forEach((el) => {
        const text = el.textContent?.toLowerCase() || '';
        const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();

        if (
            text.includes('create new entry') ||
            aria.includes('create new entry') ||
            aria.includes('edit') ||
            aria.includes('more actions') ||
            (el.getAttribute('aria-haspopup') === 'menu' &&
                !aria.includes('user') &&
                !aria.includes('account'))
        ) {
            // Never remove items that are our own buttons or inside sidebar/nav
            if (
                !el.classList.contains('custom-action-btn') &&
                !el.closest('nav') &&
                !el.closest('aside')
            ) {
                el.remove();
            }
        }
    });
};
