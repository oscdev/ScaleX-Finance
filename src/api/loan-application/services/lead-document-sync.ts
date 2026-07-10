import fs from 'fs/promises';
import path from 'path';
import type { Core } from '@strapi/strapi';
import {
  buildLeadUploadFolderName,
  getLeadUploadDiskDir,
} from '../utils/lead-upload-folder';
import {
  CIBIL_REPORT_FILENAME,
  buildCibilReportRelPath,
  queueBureauExtraction,
} from './queue-bureau-extraction';

const UPLOAD_FILE_UID = 'plugin::upload.file';
const API_UPLOADS_SEGMENT = path.join('uploads', 'api_uploads');

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_').trim();
  return base || 'document';
}

async function resolveUniqueDestPath(targetDir: string, filename: string): Promise<string> {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext) || 'document';
  let candidate = path.join(targetDir, filename);
  let counter = 1;

  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(targetDir, `${stem}_${counter}${ext}`);
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

function resolveDestPath(
  targetDir: string,
  fieldKey: string | undefined,
  originalName: string
): Promise<string> {
  if (fieldKey === 'cibilReport') {
    return Promise.resolve(path.join(targetDir, CIBIL_REPORT_FILENAME));
  }
  return resolveUniqueDestPath(targetDir, sanitizeFilename(originalName));
}

function toPublicUrl(folderName: string, filename: string): string {
  return `/uploads/api_uploads/${folderName}/${filename}`;
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // already removed or never existed
  }
}

async function removeFormatFilesFromDisk(formats: unknown): Promise<void> {
  if (!formats || typeof formats !== 'object') return;

  for (const value of Object.values(formats as Record<string, { url?: string }>)) {
    if (!value?.url) continue;
    const diskPath = path.join(
      process.cwd(),
      'public',
      value.url.replace(/^\//, '')
    );
    await unlinkIfExists(diskPath);
  }
}

async function moveFile(sourcePath: string, destPath: string): Promise<void> {
  await unlinkIfExists(destPath);
  try {
    await fs.rename(sourcePath, destPath);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'EXDEV') {
      throw err;
    }
    await fs.copyFile(sourcePath, destPath);
    await unlinkIfExists(sourcePath);
  }
}

export type SyncLeadDocumentsOptions = {
  loanApplicationId?: number;
};

export async function syncLeadDocumentsToDisk(
  strapi: Core.Strapi,
  leadId: number | string,
  applicantName: string,
  fileIds: Iterable<number>,
  fileFieldById: Record<number, string> = {},
  options: SyncLeadDocumentsOptions = {}
) {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  const targetDir = getLeadUploadDiskDir(folderName);
  await fs.mkdir(targetDir, { recursive: true });

  const results: Array<{
    fileId: number;
    ok: boolean;
    destPath?: string;
    url?: string;
    fieldKey?: string;
    error?: string;
  }> = [];

  for (const fileId of fileIds) {
    const fieldKey = fileFieldById[fileId];
    try {
      const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
        where: { id: fileId },
      });

      if (!file?.hash || !file?.ext) {
        results.push({ fileId, ok: false, error: 'File record not found', fieldKey });
        continue;
      }

      const destPath = await resolveDestPath(
        targetDir,
        fieldKey,
        file.name || `${file.hash}${file.ext}`
      );
      const destFilename = path.basename(destPath);
      const publicUrl = toPublicUrl(folderName, destFilename);

      if (
        file.url?.includes(`/api_uploads/${folderName}/`) &&
        file.url.endsWith(`/${destFilename}`)
      ) {
        try {
          await fs.access(destPath);
          results.push({ fileId, ok: true, destPath, url: file.url, fieldKey });
          continue;
        } catch {
          // fall through
        }
      }

      const hashSourcePath = path.join(
        process.cwd(),
        'public',
        'uploads',
        `${file.hash}${file.ext}`
      );

      let moved = false;

      try {
        await fs.access(hashSourcePath);
        await moveFile(hashSourcePath, destPath);
        moved = true;
      } catch {
        if (file.url) {
          const currentDiskPath = path.join(
            process.cwd(),
            'public',
            file.url.replace(/^\//, '')
          );
          try {
            await fs.access(currentDiskPath);
            if (currentDiskPath !== destPath) {
              await moveFile(currentDiskPath, destPath);
            }
            moved = true;
          } catch {
            // not found
          }
        }
      }

      if (!moved) {
        results.push({ fileId, ok: false, error: 'Source file not found on disk', fieldKey });
        continue;
      }

      await removeFormatFilesFromDisk(file.formats);

      await strapi.entityService.update(UPLOAD_FILE_UID, fileId, {
        data: {
          url: publicUrl,
          formats: null,
        },
      });

      results.push({ fileId, ok: true, destPath, url: publicUrl, fieldKey });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.error(`[LeadDocSync] Failed to move file ${fileId}: ${message}`);
      results.push({ fileId, ok: false, error: message, fieldKey });
    }
  }

  strapi.log.info(
    `[LeadDocSync] Moved ${results.filter((r) => r.ok).length}/${results.length} file(s) to public/${API_UPLOADS_SEGMENT}/${folderName}/`
  );

  const cibilTouched = results.some((r) => r.ok && r.fieldKey === 'cibilReport');
  if (cibilTouched) {
    const cibilRelPath = buildCibilReportRelPath(leadId, applicantName);
    strapi.log.info(
      `[LeadDocSync] Queueing bureau extraction for ${cibilRelPath}`
    );
    queueBureauExtraction(strapi, {
      leadId,
      applicantName,
      loanApplicationId: options.loanApplicationId,
    });
  }

  return { folderName, targetDir, results };
}
