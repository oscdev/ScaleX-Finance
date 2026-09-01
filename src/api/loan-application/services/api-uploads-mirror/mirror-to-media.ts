import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { Core } from '@strapi/strapi';
import { UPLOAD_FILE_UID } from './constants';
import { withMirrorGuard } from './guard';
import {
  diskPathFromPublicUrl,
  getLeadDiskDir,
  mimeFromFilename,
  parseDiskRelPath,
  toPublicUrl,
} from './paths';
import { ensureMediaLeadFolder } from './folders';
import { maybeQueueBureauForDiskFile } from './cibil-hook';

export type MirrorToMediaOptions = {
  relPath?: string;
};

async function findFileByUrl(
  strapi: Core.Strapi,
  publicUrl: string
): Promise<{ id: number } | null> {
  return strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { url: publicUrl },
  });
}

async function findFileInLeadFolder(
  strapi: Core.Strapi,
  folderId: number,
  filename: string
): Promise<{ id: number; url?: string } | null> {
  return strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { folder: folderId, name: filename },
  });
}

export async function mirrorDiskFileToMedia(
  strapi: Core.Strapi,
  relPath: string,
  options: MirrorToMediaOptions = {}
): Promise<{ ok: boolean; fileId?: number; error?: string }> {
  const parsed = parseDiskRelPath(relPath);
  if (!parsed) {
    return { ok: false, error: 'Invalid api_uploads path' };
  }

  const { leadFolder, filename } = parsed;
  const diskPath = path.join(getLeadDiskDir(leadFolder), filename);
  const publicUrl = toPublicUrl(leadFolder, filename);
  const guardKey = `disk:${leadFolder}/${filename}`;

  const result = await withMirrorGuard(guardKey, async () => {
    let stats;
    try {
      stats = await fs.stat(diskPath);
    } catch {
      return { ok: false, error: 'Disk file not found' };
    }

    if (!stats.isFile()) {
      return { ok: false, error: 'Not a file' };
    }

    const leadMlFolder = await ensureMediaLeadFolder(strapi, leadFolder);
    if (!leadMlFolder) {
      return { ok: false, error: 'Could not ensure Media Library folder' };
    }

    const ext = path.extname(filename);
    const mime = mimeFromFilename(filename);

    let existing =
      (await findFileByUrl(strapi, publicUrl)) ||
      (await findFileInLeadFolder(strapi, leadMlFolder.id, filename));

    if (existing) {
      const mlGuard = `ml:file:${existing.id}`;
      return withMirrorGuard(mlGuard, async () => {
        await strapi.entityService.update(UPLOAD_FILE_UID, existing!.id, {
          data: {
            name: filename,
            url: publicUrl,
            size: stats.size,
            mime,
            ext,
            folder: leadMlFolder.id,
            folderPath: leadMlFolder.path,
            formats: null,
          },
        });
        strapi.log.info(
          `[ApiUploadsMirror] Updated ML file ${existing!.id} from disk ${relPath}`
        );
        await maybeQueueBureauForDiskFile(strapi, leadFolder, filename);
        return { ok: true, fileId: existing!.id };
      });
    }

    const hash = crypto
      .createHash('md5')
      .update(`${leadFolder}/${filename}-${stats.mtimeMs}`)
      .digest('hex')
      .slice(0, 22);

    const created = await strapi.entityService.create(UPLOAD_FILE_UID, {
      data: {
        name: filename,
        alternativeText: null,
        caption: null,
        hash,
        ext,
        mime,
        size: stats.size,
        url: publicUrl,
        previewUrl: null,
        provider: 'local',
        folder: leadMlFolder.id,
        folderPath: leadMlFolder.path,
        formats: null,
      },
    });

    strapi.log.info(
      `[ApiUploadsMirror] Created ML file ${created.id} from disk ${relPath}`
    );
    await maybeQueueBureauForDiskFile(strapi, leadFolder, filename);
    return { ok: true, fileId: created.id as number };
  });

  return result ?? { ok: false, error: 'Mirror guard active' };
}

export async function mirrorDiskPathToMedia(
  strapi: Core.Strapi,
  absOrRelPath: string
): Promise<{ ok: boolean; fileId?: number; error?: string }> {
  const resolved = path.isAbsolute(absOrRelPath)
    ? absOrRelPath
    : diskPathFromPublicUrl(absOrRelPath.startsWith('/') ? absOrRelPath : `/${absOrRelPath}`);

  const rel = parseDiskRelPath(resolved);
  if (!rel) {
    return { ok: false, error: 'Path outside api_uploads' };
  }
  return mirrorDiskFileToMedia(strapi, `${rel.leadFolder}/${rel.filename}`);
}
