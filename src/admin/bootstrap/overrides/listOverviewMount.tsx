import React from 'react';
import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { reactRoots, unmountAndRemove } from './reactRoots';

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

/** Mount overview banner above the CM/settings list table; unmount when path does not match. */
export const applyListOverviewMount = ({ rootId, matchPath, Dashboard }: MountOpts) => {
    if (!matchPath()) {
        unmountAndRemove(rootId);
        return;
    }

    const table = document.querySelector('table');
    if (!table || !table.querySelector('thead tr')) return;

    const tableContainer = table.closest('div');
    if (!tableContainer?.parentElement || document.getElementById(rootId)) return;

    const overviewRoot = document.createElement('div');
    overviewRoot.id = rootId;
    tableContainer.parentNode?.insertBefore(overviewRoot, tableContainer);
    const root = createRoot(overviewRoot);
    reactRoots.set(rootId, root);
    root.render(
        <DesignSystemProvider>
            <Dashboard />
        </DesignSystemProvider>
    );
};
