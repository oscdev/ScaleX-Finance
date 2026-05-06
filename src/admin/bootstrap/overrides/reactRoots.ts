import { Root } from 'react-dom/client';

export const reactRoots = new Map<string, Root>();

export const unmountAndRemove = (id: string) => {
    const root = reactRoots.get(id);
    if (root) {
        queueMicrotask(() => {
            try { root.unmount(); } catch { }
        });
        reactRoots.delete(id);
    }
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
};
