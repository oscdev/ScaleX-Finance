import path from 'path';
import type { Core } from '@strapi/strapi';
import { getApiUploadsDiskRoot } from './paths';
import { queueWatcherMirrorToMedia } from './watcher-queue';
import { mirrorDeleteFromDisk } from './mirror-delete';
import { ensureMediaLeadFolder } from './folders';
import { UPLOAD_FOLDER_UID } from './constants';
import { getApiUploadsRootFolder } from './scope';

type WatcherHandle = { close: () => Promise<void> };

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

function toRelPath(absPath: string): string | null {
  const root = getApiUploadsDiskRoot();
  const resolved = path.resolve(absPath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return path.relative(root, resolved).replace(/\\/g, '/');
}

function shouldIgnore(relPath: string): boolean {
  const base = path.basename(relPath);
  return base.startsWith('.') || base.endsWith('.tmp') || base.endsWith('.partial');
}

export async function startApiUploadsWatcher(strapi: Core.Strapi): Promise<WatcherHandle | null> {
  if (process.env.API_UPLOADS_MIRROR_WATCH === 'false') {
    strapi.log.info('[ApiUploadsMirror] Filesystem watcher disabled (API_UPLOADS_MIRROR_WATCH=false)');
    return null;
  }

  let chokidar: typeof import('chokidar');
  try {
    chokidar = await import('chokidar');
  } catch {
    strapi.log.warn('[ApiUploadsMirror] chokidar not installed — watcher skipped');
    return null;
  }

  const root = getApiUploadsDiskRoot();
  const watcher = chokidar.watch(root, {
    ignored: (p) => {
      const base = path.basename(p);
      return base.endsWith('.tmp') || base.endsWith('.partial');
    },
    ignoreInitial: true,
    persistent: true,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on('add', (filePath) => {
    const rel = toRelPath(filePath);
    if (!rel || shouldIgnore(rel)) return;
    debounce(`add:${rel}`, () => {
      queueWatcherMirrorToMedia(strapi, rel, (message) => {
        strapi.log.error(`[ApiUploadsMirror] watcher add ${rel}: ${message}`);
      });
    });
  });

  watcher.on('change', (filePath) => {
    const rel = toRelPath(filePath);
    if (!rel || shouldIgnore(rel)) return;
    debounce(`change:${rel}`, () => {
      queueWatcherMirrorToMedia(strapi, rel, (message) => {
        strapi.log.error(`[ApiUploadsMirror] watcher change ${rel}: ${message}`);
      });
    });
  });

  watcher.on('unlink', (filePath) => {
    const rel = toRelPath(filePath);
    if (!rel || shouldIgnore(rel)) return;
    debounce(`unlink:${rel}`, () => {
      void mirrorDeleteFromDisk(strapi, rel).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] watcher unlink ${rel}: ${message}`);
      });
    });
  });

  watcher.on('addDir', (dirPath) => {
    const rel = toRelPath(dirPath);
    if (!rel || rel === '') return;
    debounce(`addDir:${rel}`, () => {
      void ensureMediaLeadFolder(strapi, rel).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] watcher addDir ${rel}: ${message}`);
      });
    });
  });

  watcher.on('unlinkDir', (dirPath) => {
    const rel = toRelPath(dirPath);
    if (!rel) return;
    debounce(`unlinkDir:${rel}`, () => {
      void deleteMediaFolderByName(strapi, rel).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] watcher unlinkDir ${rel}: ${message}`);
      });
    });
  });

  strapi.log.info(`[ApiUploadsMirror] Watching ${root}`);
  return {
    close: async () => {
      await watcher.close();
    },
  };
}

async function deleteMediaFolderByName(strapi: Core.Strapi, folderName: string): Promise<void> {
  const root = await getApiUploadsRootFolder(strapi);
  if (!root?.path) return;

  const leadFolder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
    where: {
      name: folderName,
      path: { $startsWith: `${root.path}/` },
    },
  });
  if (!leadFolder) return;

  const folderService = strapi.plugin('upload').service('folder');
  try {
    await folderService.deleteByIds([leadFolder.id]);
    strapi.log.info(`[ApiUploadsMirror] Deleted ML folder ${folderName}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi.log.warn(`[ApiUploadsMirror] Failed to delete ML folder ${folderName}: ${message}`);
  }
}
