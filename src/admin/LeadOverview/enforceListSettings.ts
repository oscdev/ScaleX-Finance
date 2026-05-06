export const enforceDefaultListSettings = () => {
    const path = window.location.pathname;

    const isCollectionView =
        path.includes('/content-manager/collection-types/') && !path.includes('/configurations');
    const isEditPage = /^\d+$/.test(path.split('/').pop() || '');

    if (!isCollectionView || isEditPage) return;

    // Strip any query params Strapi adds — keep URLs clean without redirecting
    if (window.location.search) {
        history.replaceState(null, '', path);
    }
};
