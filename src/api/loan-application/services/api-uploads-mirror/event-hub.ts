import fs from 'fs/promises';
import type { Core } from '@strapi/strapi';
import { API_UPLOADS_ROOT_NAME } from './constants';
import { withMirrorGuard } from './guard';
import { ensureDiskLeadFolder } from './folders';
import { getApiUploadsDiskRoot } from './paths';
import { mirrorFileToDisk } from './mirror-to-disk';
import { mirrorDeleteFileFromMedia } from './mirror-delete';
import { mirrorDeleteLeadFoldersOnDisk } from './mirror-folder-delete';
import { isApiUploadsLeadFolder } from './scope';

function scheduleMirror(fn: () => Promise<void>): void {
  setImmediate(() => {
    void fn().catch(() => {
      // logged inside handlers
    });
  });
}

export function registerApiUploadsEventHubMirror(strapi: Core.Strapi): void {
  strapi.eventHub.on('media.create', async (payload: { media?: { id?: number } }) => {
    const fileId = payload?.media?.id;
    if (!fileId) return;

    scheduleMirror(async () => {
      try {
        const result = await mirrorFileToDisk(strapi, fileId);
        if (!result.ok && result.error !== 'File not in API Uploads scope') {
          strapi.log.warn(
            `[ApiUploadsMirror] media.create file ${fileId}: ${result.error}`
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] media.create file ${fileId}: ${message}`);
      }
    });
  });

  strapi.eventHub.on('media.update', async (payload: { media?: { id?: number } }) => {
    const fileId = payload?.media?.id;
    if (!fileId) return;

    scheduleMirror(async () => {
      try {
        const result = await mirrorFileToDisk(strapi, fileId);
        if (!result.ok && result.error !== 'File not in API Uploads scope') {
          strapi.log.warn(
            `[ApiUploadsMirror] media.update file ${fileId}: ${result.error}`
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] media.update file ${fileId}: ${message}`);
      }
    });
  });

  strapi.eventHub.on('media.delete', async (payload: { media?: { id?: number } }) => {
    const fileId = payload?.media?.id;
    if (!fileId) return;

    scheduleMirror(async () => {
      try {
        await mirrorDeleteFileFromMedia(strapi, fileId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] media.delete file ${fileId}: ${message}`);
      }
    });
  });

  strapi.eventHub.on(
    'media-folder.create',
    async (payload: { folder?: { id?: number; name?: string } }) => {
      const folder = payload?.folder;
      if (!folder?.id || !folder.name) return;

      scheduleMirror(async () => {
        try {
          if (folder.name === API_UPLOADS_ROOT_NAME) {
            await fs.mkdir(getApiUploadsDiskRoot(), { recursive: true });
            return;
          }

          if (!(await isApiUploadsLeadFolder(strapi, folder.id!))) return;

          const guardKey = `ml:folder:${folder.id}`;
          await withMirrorGuard(guardKey, async () => {
            await ensureDiskLeadFolder(folder.name!);
            strapi.log.info(
              `[ApiUploadsMirror] Created disk folder for ML folder ${folder.name}`
            );
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          strapi.log.error(
            `[ApiUploadsMirror] media-folder.create ${folder.name}: ${message}`
          );
        }
      });
    }
  );

  strapi.eventHub.on(
    'media-folder.delete',
    async (payload: { folders?: Array<{ id?: number; name?: string; path?: string }> }) => {
      const folders = payload?.folders ?? [];
      if (!folders.length) return;

      try {
        await mirrorDeleteLeadFoldersOnDisk(strapi, folders);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error(`[ApiUploadsMirror] media-folder.delete: ${message}`);
      }
    }
  );

  strapi.log.info('[ApiUploadsMirror] Registered upload eventHub listeners');
}
