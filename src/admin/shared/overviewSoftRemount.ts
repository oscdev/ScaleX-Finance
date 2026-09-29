/**
 * Soft remount helpers for Collection Type overview banners.
 * When the overview host is destroyed/recreated, skip Loader flash and seed last stats.
 */

let skipNextOverviewLoader = false;

type StatsBag = Record<string, unknown>;

const lastStatsByKey: Record<string, StatsBag> = {};

export const markSkipOverviewLoader = (): void => {
    skipNextOverviewLoader = true;
};

export const consumeSkipOverviewLoader = (): boolean => {
    if (!skipNextOverviewLoader) return false;
    skipNextOverviewLoader = false;
    return true;
};

export const stashOverviewStats = (key: string, stats: StatsBag): void => {
    try {
        lastStatsByKey[key] = { ...stats };
    } catch {
        /* ignore */
    }
};

export const takeStashedOverviewStats = <T extends StatsBag>(key: string): T | null => {
    const cached = lastStatsByKey[key];
    if (!cached) return null;
    return { ...cached } as T;
};
