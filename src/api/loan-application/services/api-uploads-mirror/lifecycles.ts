import fs from 'fs/promises';
import type { Core } from '@strapi/strapi';
import { UPLOAD_FILE_UID, UPLOAD_FOLDER_UID } from './constants';
import { withMirrorGuard } from './guard';
import {
  ensureDiskLeadFolder,
  isFileInApiUploadsScope,
  isApiUploadsLeadFolder,
} from './folders';
import { mirrorFileToDisk } from './mirror-to-disk';
import { mirrorDeleteFileFromMedia } from './mirror-delete';
import { mirrorDeleteLeadFoldersOnDisk, findFoldersFromDeleteManyWhere } from './mirror-folder-delete';
import { API_UPLOADS_ROOT_NAME } from './constants';
import { getApiUploadsDiskRoot, getLeadDiskDir } from './paths';

function scheduleMirror(fn: () => Promise<void>): void {
  setImmediate(() => {
    void fn().catch(() => {
      // logged inside handlers
    });
  });
}

export function registerApiUploadsMirrorLifecycles(strapi: Core.Strapi): void {
  strapi.db.lifecycles.subscribe({
    models: [UPLOAD_FILE_UID],
    async afterCreate(event) {
      const fileId = event.result?.id;
      if (!fileId) return;

      scheduleMirror(async () => {
        try {
          await mirrorFileToDisk(strapi, fileId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          strapi.log.error(`[ApiUploadsMirror] afterCreate file ${fileId}: ${message}`);
        }
      });
    },

    async afterUpdate(event) {
      const fileId = event.result?.id;
      if (!fileId) return;

      scheduleMirror(async () => {
        try {
          await mirrorFileToDisk(strapi, fileId);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          strapi.log.error(`[ApiUploadsMirror] afterUpdate file ${fileId}: ${message}`);
        }
      });
    },

    async beforeDelete(event) {
      const where = event.params?.where as { id?: number } | undefined;
      const fileId = where?.id ?? event.result?.id;
      if (!fileId) return;

      const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
        where: { id: fileId },
      });
      if (!file) return;
      if (!(await isFileInApiUploadsScope(strapi, file))) return;

      await mirrorDeleteFileFromMedia(strapi, fileId);
    },
  });

  strapi.db.lifecycles.subscribe({
    models: [UPLOAD_FOLDER_UID],
    async afterCreate(event) {
      const folder = event.result;
      if (!folder?.id || !folder.name) return;

      const parentId =
        typeof folder.parent === 'object' ? folder.parent?.id : folder.parent;

      if (!parentId && folder.name === API_UPLOADS_ROOT_NAME) {
        await fs.mkdir(getApiUploadsDiskRoot(), { recursive: true });
        return;
      }

      if (!(await isApiUploadsLeadFolder(strapi, folder.id))) return;

      const guardKey = `ml:folder:${folder.id}`;
      await withMirrorGuard(guardKey, async () => {
        await ensureDiskLeadFolder(folder.name);
        strapi.log.info(
          `[ApiUploadsMirror] Created disk folder for ML folder ${folder.name}`
        );
      });
    },

    async beforeUpdate(event) {
      const folderId = (event.params?.where as { id?: number } | undefined)?.id;
      if (!folderId) return;
      if (!(await isApiUploadsLeadFolder(strapi, folderId))) return;

      const existing = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
        where: { id: folderId },
      });
      if (!existing?.name) return;

      (event as { state?: Record<string, unknown> }).state = {
        ...((event as { state?: Record<string, unknown> }).state ?? {}),
        apiUploadsMirrorOldFolderName: existing.name,
      };
    },

    async afterUpdate(event) {
      const folder = event.result;
      const oldName = (event as { state?: { apiUploadsMirrorOldFolderName?: string } })
        .state?.apiUploadsMirrorOldFolderName;

      if (!folder?.id || !folder.name || !oldName || oldName === folder.name) return;
      if (!(await isApiUploadsLeadFolder(strapi, folder.id))) return;

      const guardKey = `ml:folder:${folder.id}:rename`;
      await withMirrorGuard(guardKey, async () => {
        const oldDir = getLeadDiskDir(oldName);
        const newDir = getLeadDiskDir(folder.name);
        try {
          await fs.access(oldDir);
          await fs.rename(oldDir, newDir);
          strapi.log.info(
            `[ApiUploadsMirror] Renamed disk folder ${oldName} → ${folder.name}`
          );
        } catch {
          await fs.mkdir(newDir, { recursive: true });
        }
      });
    },

    async beforeDelete(event) {
      const where = event.params?.where as { id?: number } | undefined;
      const folderId = where?.id;
      if (folderId) {
        const folder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
          where: { id: folderId },
        });
        if (folder) {
          await mirrorDeleteLeadFoldersOnDisk(strapi, [folder]);
        }
        return;
      }
    },

    async beforeDeleteMany(event) {
      const where = event.params?.where;
      const folders = await findFoldersFromDeleteManyWhere(strapi, where);
      if (folders.length) {
        await mirrorDeleteLeadFoldersOnDisk(strapi, folders);
      }
    },
  });
}
