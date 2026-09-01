import fs from 'fs/promises';
import type { Core } from '@strapi/strapi';
import { API_UPLOADS_ROOT_NAME, UPLOAD_FOLDER_UID } from './constants';
import { getLeadDiskDir } from './paths';
import { withMirrorGuard } from './guard';
import { getApiUploadsRootFolder } from './scope';

export type MediaFolderRef = {
  id?: number;
  name?: string;
  path?: string;
};

export function isDirectChildOfApiUploadsRoot(
  rootPath: string,
  folderPath: string
): boolean {
  const prefix = `${rootPath}/`;
  if (!folderPath.startsWith(prefix)) return false;
  const remainder = folderPath.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes('/');
}

export function shouldMirrorDeleteFolder(
  root: { path?: string; name?: string } | null,
  folder: MediaFolderRef
): boolean {
  if (!folder.name || folder.name === API_UPLOADS_ROOT_NAME) return false;
  if (root?.path && folder.path) {
    return isDirectChildOfApiUploadsRoot(root.path, folder.path);
  }
  // Fallback when root/path metadata is unavailable
  return /^\d+-/.test(folder.name);
}

export async function mirrorDeleteLeadFoldersOnDisk(
  strapi: Core.Strapi,
  folders: MediaFolderRef[]
): Promise<void> {
  if (!folders.length) return;

  const root = await getApiUploadsRootFolder(strapi);

  for (const folder of folders) {
    if (!shouldMirrorDeleteFolder(root, folder)) continue;

    const guardKey = `ml:folder:${folder.id ?? folder.name}:delete`;
    await withMirrorGuard(guardKey, async () => {
      const diskDir = getLeadDiskDir(folder.name!);
      try {
        await fs.rm(diskDir, { recursive: true, force: true });
        strapi.log.info(`[ApiUploadsMirror] Removed disk folder ${folder.name}`);
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code !== 'ENOENT') {
          const message = err instanceof Error ? err.message : String(err);
          strapi.log.warn(
            `[ApiUploadsMirror] Failed to remove disk folder ${folder.name}: ${message}`
          );
        }
      }
    });
  }
}

/** Resolve folders targeted by deleteMany before rows are removed. */
export async function findFoldersFromDeleteManyWhere(
  strapi: Core.Strapi,
  where: unknown
): Promise<MediaFolderRef[]> {
  if (!where || typeof where !== 'object') return [];

  try {
    const rows = await strapi.db.query(UPLOAD_FOLDER_UID).findMany({
      where: where as Record<string, unknown>,
    });
    return rows as MediaFolderRef[];
  } catch {
    return [];
  }
}
