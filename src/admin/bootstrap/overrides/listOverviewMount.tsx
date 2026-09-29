import React from 'react';
import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { reactRoots, unmountAndRemove } from './reactRoots';
import { markSkipOverviewLoader } from '../../shared/overviewSoftRemount';

/** CM list path for a UID (no trailing document id segment). */
export const isCmCollectionListPath = (uid: string): boolean => {
    const path = window.location.pathname;
    if (!path.includes(uid)) return false;
    // Edit/create: .../api::foo.bar/<documentId or create>
    const escaped = uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`${escaped}/[^/?]+`).test(path);
};

type MountOpts = {
    rootId: string;
    matchPath: () => boolean;
    Dashboard: React.ComponentType;
};

/**
 * Mount overview banner after CM Filters / before the list table.
 * Soft list refetch may destroy the host; we recreate it and skip the banner Loader once.
 */
export const applyListOverviewMount = ({ rootId, matchPath, Dashboard }: MountOpts) => {
    if (!matchPath()) {
        unmountAndRemove(rootId);
        return;
    }

    const table = document.querySelector('table');
    if (!table || !table.querySelector('thead tr')) return;

    const tableContainer = table.closest('div');
    const parent = tableContainer?.parentElement;
    if (!tableContainer || !parent) return;

    let overviewRoot = document.getElementById(rootId) as HTMLDivElement | null;
    const existingReactRoot = reactRoots.get(rootId);

    // Already correctly placed — keep React root.
    if (
        overviewRoot &&
        existingReactRoot &&
        overviewRoot.parentElement === parent &&
        overviewRoot.nextSibling === tableContainer
    ) {
        return;
    }

    // Host still alive but wrong slot — move without remounting React.
    if (overviewRoot && existingReactRoot) {
        overviewRoot.style.marginBottom = overviewRoot.style.marginBottom || '16px';
        parent.insertBefore(overviewRoot, tableContainer);
        return;
    }

    // Soft CM remount destroyed the host; React root is orphaned.
    if (!overviewRoot && existingReactRoot) {
        markSkipOverviewLoader();
        reactRoots.delete(rootId);
        try {
            existingReactRoot.unmount();
        } catch {
            /* ignore */
        }
    }

    // Orphan DOM without a tracked root.
    if (overviewRoot && !existingReactRoot) {
        overviewRoot.remove();
        overviewRoot = null;
    }

    overviewRoot = document.createElement('div');
    overviewRoot.id = rootId;
    overviewRoot.style.marginBottom = '16px';
    parent.insertBefore(overviewRoot, tableContainer);

    const root = createRoot(overviewRoot);
    reactRoots.set(rootId, root);
    root.render(
        <DesignSystemProvider>
            <Dashboard />
        </DesignSystemProvider>
    );
};
