import path from 'path';
import type { Core } from '@strapi/strapi';
import { getLendersLogosDiskRoot } from './paths';
import { mirrorDiskLogoRemoved, mirrorDiskLogoToCatalog } from './sync';

const DEBOUNCE_MS = 400;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debounce(key: string, fn: () => void): void {
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key);
      fn();
    }, DEBOUNCE_MS)
  );
}

function shouldIgnore(filePath: string): boolean {
  const base = path.basename(filePath);
  return base.startsWith('.') || base.endsWith('.tmp') || base.endsWith('.partial');
}

export async function startLendersLogosWatcher(strapi: Core.Strapi): Promise<void> {
  if (process.env.LENDERS_LOGOS_MIRROR_WATCH === 'false') {
    strapi.log.info('[LendersLogos] Filesystem watcher disabled (LENDERS_LOGOS_MIRROR_WATCH=false)');
    return;
  }

  let chokidar: typeof import('chokidar');
  try {
    chokidar = await import('chokidar');
  } catch {
    strapi.log.warn('[LendersLogos] chokidar not installed — watcher skipped');
    return;
  }

  const root = getLendersLogosDiskRoot();
  const watcher = chokidar.watch(root, {
    ignored: (watched) => shouldIgnore(String(watched)),
    ignoreInitial: true,
    persistent: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('add', (filePath) => {
    if (shouldIgnore(filePath)) return;
    const filename = path.basename(filePath);
    debounce(`add:${filename}`, () => {
      mirrorDiskLogoToCatalog(strapi, filename).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[LendersLogos] watcher add ${filename}: ${message}`);
      });
    });
  });

  watcher.on('change', (filePath) => {
    if (shouldIgnore(filePath)) return;
    const filename = path.basename(filePath);
    debounce(`change:${filename}`, () => {
      mirrorDiskLogoToCatalog(strapi, filename).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[LendersLogos] watcher change ${filename}: ${message}`);
      });
    });
  });

  watcher.on('unlink', (filePath) => {
    if (shouldIgnore(filePath)) return;
    const filename = path.basename(filePath);
    debounce(`unlink:${filename}`, () => {
      mirrorDiskLogoRemoved(strapi, filename).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[LendersLogos] watcher unlink ${filename}: ${message}`);
      });
    });
  });

  strapi.log.info(`[LendersLogos] Watching ${root}`);
}
