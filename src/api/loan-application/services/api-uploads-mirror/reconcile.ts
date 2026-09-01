import fs from 'fs/promises';
import path from 'path';
import type { Core } from '@strapi/strapi';
import { API_UPLOADS_ROOT_NAME, UPLOAD_FILE_UID, UPLOAD_FOLDER_UID } from './constants';
import { getApiUploadsDiskRoot, parseDiskRelPath, toPublicUrl } from './paths';
import { ensureApiUploadsRootFolder, ensureMediaLeadFolder } from './folders';
import { mirrorFileToDisk, cleanupFieldDocumentsForLead } from './mirror-to-disk';
import { mirrorDiskFileToMedia } from './mirror-to-media';
import { mirrorDeleteFileFromMedia, mirrorDeleteFromDisk } from './mirror-delete';
import { parseLeadIdFromFolderName } from './cibil-hook';
import {
  FIELD_DOCUMENT_BASENAMES,
  fieldNumberedBasenameFilenameRegex,
  isSingleFileDocumentField,
  matchesFieldCleanupFilename,
} from '../../../../shared/loan-form/document-filenames';

const LOAN_APP_UID = 'api::loan-application.loan-application';

export type ReconcileSummary = {
  added_to_disk: number;
  added_to_ml: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

async function listDiskFiles(): Promise<Map<string, { size: number; mtimeMs: number }>> {
  const root = getApiUploadsDiskRoot();
  const map = new Map<string, { size: number; mtimeMs: number }>();

  async function walk(dir: string, relPrefix: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        const stats = await fs.stat(full);
        map.set(rel.replace(/\\/g, '/'), {
          size: stats.size,
          mtimeMs: stats.mtimeMs,
        });
      }
    }
  }

  await walk(root, '');
  return map;
}

async function listMediaFiles(
  strapi: Core.Strapi
): Promise<
  Map<string, { id: number; size: number; url: string; name: string }>
> {
  const root = await ensureApiUploadsRootFolder(strapi);
  const map = new Map<string, { id: number; size: number; url: string; name: string }>();
  if (!root) return map;

  const leadFolders = await strapi.db.query(UPLOAD_FOLDER_UID).findMany({
    where: { parent: root.id },
  });

  for (const leadFolder of leadFolders) {
    const files = await strapi.db.query(UPLOAD_FILE_UID).findMany({
      where: { folder: leadFolder.id },
    });

    for (const file of files) {
      const rel = `${leadFolder.name}/${file.name}`;
      map.set(rel, {
        id: file.id,
        size: Number(file.size) || 0,
        url: file.url,
        name: file.name,
      });
    }
  }

  return map;
}

async function listDiskFilesForFolder(
  leadFolderName: string
): Promise<Map<string, { size: number; mtimeMs: number }>> {
  const map = new Map<string, { size: number; mtimeMs: number }>();
  const dir = path.join(getApiUploadsDiskRoot(), leadFolderName);

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return map;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const rel = `${leadFolderName}/${entry.name}`;
    const full = path.join(dir, entry.name);
    const stats = await fs.stat(full);
    map.set(rel, { size: stats.size, mtimeMs: stats.mtimeMs });
  }

  return map;
}

async function listMediaFilesForFolder(
  strapi: Core.Strapi,
  leadFolderName: string
): Promise<Map<string, { id: number; size: number; url: string; name: string }>> {
  const map = new Map<string, { id: number; size: number; url: string; name: string }>();
  const leadFolder = await ensureMediaLeadFolder(strapi, leadFolderName);
  if (!leadFolder?.id) return map;

  const files = await strapi.db.query(UPLOAD_FILE_UID).findMany({
    where: { folder: leadFolder.id },
  });

  for (const file of files) {
    const rel = `${leadFolderName}/${file.name}`;
    map.set(rel, {
      id: file.id,
      size: Number(file.size) || 0,
      url: file.url,
      name: file.name,
    });
  }

  return map;
}

export type LeadFolderFileRow = {
  id: number;
  name: string;
  url: string;
  ext: string | null;
  mime: string | null;
  size: number;
  createdAt: string | null;
};

export async function listLeadFolderMediaFiles(
  strapi: Core.Strapi,
  leadFolderName: string
): Promise<LeadFolderFileRow[]> {
  const leadFolder = await ensureMediaLeadFolder(strapi, leadFolderName);
  if (!leadFolder?.id) return [];

  const files = await strapi.db.query(UPLOAD_FILE_UID).findMany({
    where: { folder: leadFolder.id },
    orderBy: { createdAt: 'desc' },
  });

  return files.map((file) => ({
    id: Number(file.id),
    name: String(file.name ?? ''),
    url: String(file.url ?? ''),
    ext: file.ext != null ? String(file.ext) : null,
    mime: file.mime != null ? String(file.mime) : null,
    size: Number(file.size) || 0,
    createdAt: file.createdAt != null ? String(file.createdAt) : null,
  }));
}

async function resolveLoanAppIdFromLeadFolder(
  strapi: Core.Strapi,
  leadFolderName: string
): Promise<number | null> {
  const leadId = parseLeadIdFromFolderName(leadFolderName);
  if (!leadId) return null;

  try {
    const loanApp = await strapi.db.query(LOAN_APP_UID).findOne({
      where: { leadId },
      select: ['id'],
      orderBy: { id: 'desc' },
    });
    const id = Number(loanApp?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function getCurrentMorphFileIdsByField(
  strapi: Core.Strapi,
  loanApplicationId: number
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const knex = strapi.db.connection;
    const hasTable = await knex.schema.hasTable('files_related_mph');
    if (!hasTable) return map;

    const rows = await knex('files_related_mph')
      .where({
        related_id: loanApplicationId,
        related_type: LOAN_APP_UID,
      })
      .select('field', 'file_id');

    for (const row of rows) {
      const field = String(row.field ?? '');
      const fileId = Number(row.file_id);
      if (!field || !Number.isFinite(fileId) || fileId <= 0) continue;
      map[field] = fileId;
    }
  } catch {
    // non-fatal
  }
  return map;
}

async function isSupersededFieldDocument(
  strapi: Core.Strapi,
  leadFolderName: string,
  fileId: number,
  fileName: string
): Promise<boolean> {
  const matchingFields = Object.keys(FIELD_DOCUMENT_BASENAMES).filter(
    (fieldKey) =>
      isSingleFileDocumentField(fieldKey) && matchesFieldCleanupFilename(fieldKey, fileName)
  );
  if (!matchingFields.length) return false;

  for (const fieldKey of matchingFields) {
    if (fieldNumberedBasenameFilenameRegex(fieldKey)?.test(fileName)) {
      return false;
    }
  }

  const loanAppId = await resolveLoanAppIdFromLeadFolder(strapi, leadFolderName);
  if (!loanAppId) return false;

  const currentByField = await getCurrentMorphFileIdsByField(strapi, loanAppId);

  for (const fieldKey of matchingFields) {
    const currentId = currentByField[fieldKey];
    if (currentId == null || Number(currentId) !== fileId) {
      return true;
    }
  }

  return false;
}

async function reconcileFileKeys(
  strapi: Core.Strapi,
  leadFolderName: string,
  allKeys: Iterable<string>,
  diskFiles: Map<string, { size: number; mtimeMs: number }>,
  mlFiles: Map<string, { id: number; size: number; url: string; name: string }>,
  summary: ReconcileSummary
): Promise<void> {
  for (const rel of allKeys) {
    const disk = diskFiles.get(rel);
    const ml = mlFiles.get(rel);

    if (disk && ml) {
      const expectedUrl = toPublicUrl(
        rel.split('/').slice(0, -1).join('/'),
        rel.split('/').pop()!
      );
      if (ml.url !== expectedUrl || Math.abs(ml.size - disk.size) > 0) {
        const result = await mirrorFileToDisk(strapi, ml.id);
        if (result.ok) {
          summary.updated += 1;
        } else {
          const mediaResult = await mirrorDiskFileToMedia(strapi, rel);
          if (mediaResult.ok) summary.updated += 1;
          else {
            summary.skipped += 1;
            if (mediaResult.error) summary.errors.push(`${rel}: ${mediaResult.error}`);
          }
        }
      } else {
        summary.skipped += 1;
      }
      continue;
    }

    if (ml && !disk) {
      const relLeadFolder =
        rel.indexOf('/') >= 0 ? rel.split('/').slice(0, -1).join('/') : leadFolderName;
      const superseded = await isSupersededFieldDocument(
        strapi,
        relLeadFolder,
        ml.id,
        ml.name
      );
      if (superseded) {
        try {
          const fieldKey = Object.keys(FIELD_DOCUMENT_BASENAMES).find(
            (key) =>
              isSingleFileDocumentField(key) &&
              matchesFieldCleanupFilename(key, ml.name)
          );
          if (fieldKey) {
            const loanAppId = await resolveLoanAppIdFromLeadFolder(strapi, relLeadFolder);
            const currentByField = loanAppId
              ? await getCurrentMorphFileIdsByField(strapi, loanAppId)
              : {};
            const keepIds = currentByField[fieldKey]
              ? [Number(currentByField[fieldKey])]
              : [];

            await cleanupFieldDocumentsForLead(strapi, {
              leadFolder: relLeadFolder,
              fieldKey,
              keepFileIds: keepIds.filter((id) => Number.isFinite(id) && id > 0),
              loanApplicationId: loanAppId ?? undefined,
            });
            summary.updated += 1;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          summary.errors.push(`${rel}: archive superseded ML failed: ${message}`);
        }
        continue;
      }

      const result = await mirrorFileToDisk(strapi, ml.id);
      if (result.ok) summary.added_to_disk += 1;
      else {
        summary.errors.push(`${rel}: ${result.error || 'mirror to disk failed'}`);
      }
      continue;
    }

    if (disk && !ml) {
      const result = await mirrorDiskFileToMedia(strapi, rel);
      if (result.ok) summary.added_to_ml += 1;
      else {
        summary.errors.push(`${rel}: ${result.error || 'mirror to ML failed'}`);
      }
    }
  }
}

export async function reconcileLeadFolder(
  strapi: Core.Strapi,
  leadFolderName: string
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    added_to_disk: 0,
    added_to_ml: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  };

  await ensureApiUploadsRootFolder(strapi);
  await ensureMediaLeadFolder(strapi, leadFolderName);
  await fs.mkdir(path.join(getApiUploadsDiskRoot(), leadFolderName), { recursive: true });

  const diskFiles = await listDiskFilesForFolder(leadFolderName);
  const mlFiles = await listMediaFilesForFolder(strapi, leadFolderName);
  const allKeys = new Set([...diskFiles.keys(), ...mlFiles.keys()]);

  await reconcileFileKeys(strapi, leadFolderName, allKeys, diskFiles, mlFiles, summary);

  strapi.log.info(
    `[ApiUploadsMirror] Reconcile ${leadFolderName}: added_to_disk=${summary.added_to_disk}, added_to_ml=${summary.added_to_ml}, updated=${summary.updated}, deleted=${summary.deleted}, skipped=${summary.skipped}`
  );

  return summary;
}

export async function reconcileApiUploads(strapi: Core.Strapi): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    added_to_disk: 0,
    added_to_ml: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  };

  strapi.log.info('[ApiUploadsMirror] Starting reconcile…');

  await ensureApiUploadsRootFolder(strapi);
  await fs.mkdir(getApiUploadsDiskRoot(), { recursive: true });

  const diskFiles = await listDiskFiles();
  const mlFiles = await listMediaFiles(strapi);

  const allKeys = new Set([...diskFiles.keys(), ...mlFiles.keys()]);

  await reconcileFileKeys(strapi, '', allKeys, diskFiles, mlFiles, summary);

  strapi.log.info(
    `[ApiUploadsMirror] Reconcile complete: added_to_disk=${summary.added_to_disk}, added_to_ml=${summary.added_to_ml}, updated=${summary.updated}, deleted=${summary.deleted}, skipped=${summary.skipped}`
  );

  return summary;
}

export async function mirrorDeleteOrphanedDiskFile(
  strapi: Core.Strapi,
  relPath: string
): Promise<void> {
  const parsed = parseDiskRelPath(relPath);
  if (!parsed) return;
  await mirrorDeleteFromDisk(strapi, relPath);
}

export async function mirrorDeleteOrphanedMediaFile(
  strapi: Core.Strapi,
  fileId: number
): Promise<void> {
  await mirrorDeleteFileFromMedia(strapi, fileId);
}

export { API_UPLOADS_ROOT_NAME };
