import fs from 'fs/promises';
import type { Core } from '@strapi/strapi';
import { UPLOAD_FILE_UID } from './constants';
import { withMirrorGuard } from './guard';
import { diskPathFromPublicUrl, parseDiskRelPath } from './paths';
import { isFileInApiUploadsScope } from './folders';
import { shouldDeferCibilDiskDelete } from './cibil-disk-bytes';

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // already removed
  }
}

async function removeFormatFilesFromDisk(formats: unknown): Promise<void> {
  if (!formats || typeof formats !== 'object') return;

  for (const value of Object.values(formats as Record<string, { url?: string }>)) {
    if (!value?.url) continue;
    await unlinkIfExists(diskPathFromPublicUrl(value.url));
  }
}

export async function mirrorDeleteFileFromMedia(
  strapi: Core.Strapi,
  fileId: number
): Promise<void> {
  const guardKey = `ml:file:${fileId}:delete`;
  await withMirrorGuard(guardKey, async () => {
    const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
      where: { id: fileId },
    });
    if (!file) return;

    const inScope = await isFileInApiUploadsScope(strapi, file);
    if (!inScope) return;

    if (file.url) {
      const deferDelete = await shouldDeferCibilDiskDelete(strapi, file);
      if (deferDelete) {
        strapi.log.info(
          `[ApiUploadsMirror] Deferred disk delete for replaced CIBIL ML file ${fileId}`
        );
        return;
      }

      const diskPath = diskPathFromPublicUrl(file.url);
      const rel = parseDiskRelPath(diskPath);
      const diskGuard = rel ? `disk:${rel.leadFolder}/${rel.filename}` : `disk:${diskPath}`;
      await withMirrorGuard(diskGuard, async () => {
        await unlinkIfExists(diskPath);
        await removeFormatFilesFromDisk(file.formats);
        strapi.log.info(`[ApiUploadsMirror] Deleted disk file for ML file ${fileId}`);
      });
    }
  });
}

export async function mirrorDeleteFromDisk(
  strapi: Core.Strapi,
  relPath: string
): Promise<void> {
  const parsed = parseDiskRelPath(relPath);
  if (!parsed) return;

  const publicUrl = `/uploads/api_uploads/${parsed.leadFolder}/${parsed.filename}`;
  const guardKey = `disk:${parsed.leadFolder}/${parsed.filename}:delete`;

  await withMirrorGuard(guardKey, async () => {
    const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
      where: { url: publicUrl },
    });

    if (!file) {
      const byName = await strapi.db.query(UPLOAD_FILE_UID).findOne({
        where: { name: parsed.filename },
      });
      if (byName?.url?.includes(`/api_uploads/${parsed.leadFolder}/`)) {
        await strapi.entityService.delete(UPLOAD_FILE_UID, byName.id);
        strapi.log.info(
          `[ApiUploadsMirror] Deleted ML file ${byName.id} for disk unlink ${relPath}`
        );
      }
      return;
    }

    const mlGuard = `ml:file:${file.id}:delete`;
    await withMirrorGuard(mlGuard, async () => {
      await strapi.entityService.delete(UPLOAD_FILE_UID, file.id);
      strapi.log.info(
        `[ApiUploadsMirror] Deleted ML file ${file.id} for disk unlink ${relPath}`
      );
    });
  });
}
