import fs from 'fs/promises';
import path from 'path';
import type { Core } from '@strapi/strapi';
import { UPLOAD_FILE_UID } from './constants';
import { withMirrorGuard } from './guard';
import {
  diskPathFromPublicUrl,
  getLeadDiskDir,
  sanitizeFilename,
  toPublicUrl,
} from './paths';
import {
  isFileInApiUploadsScope,
  resolveLeadFolderNameFromFile,
  ensureMediaLeadFolder,
} from './folders';
import { maybeQueueBureauForDiskFile, parseLeadIdFromFolderName, parseApplicantNameFromFolderName } from './cibil-hook';
import { atomicCopyToPath } from './cibil-disk-bytes';
import { CIBIL_REPORT_FILENAME, promoteCanonicalCibilReportOnDisk } from '../queue-bureau-extraction';
import {
  MULTI_FILE_DOCUMENT_FIELDS,
  combineUploadName,
  isSingleFileDocumentField,
  matchesFieldCleanupFilename,
  resolveCanonicalDocumentFilename,
  resolveNextFieldArchiveFilename,
  shouldArchiveFieldOccupier,
} from '../../../../shared/loan-form/document-filenames';

const LOAN_APP_UID = 'api::loan-application.loan-application';

const GUARD_RETRY_ATTEMPTS = 6;
const GUARD_RETRY_BASE_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDestPath(
  targetDir: string,
  fieldKey: string | undefined,
  originalName: string,
  multiIndex?: number,
  mime?: string | null
): string {
  const canonical = resolveCanonicalDocumentFilename(
    fieldKey,
    originalName,
    multiIndex,
    mime
  );
  const filename = canonical ?? sanitizeFilename(originalName);
  return path.join(targetDir, filename);
}

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

async function moveFile(sourcePath: string, destPath: string, atomic = false): Promise<void> {
  if (atomic) {
    await atomicCopyToPath(sourcePath, destPath);
    if (path.resolve(sourcePath) !== path.resolve(destPath)) {
      await unlinkIfExists(sourcePath);
    }
    return;
  }

  await unlinkIfExists(destPath);
  try {
    await fs.rename(sourcePath, destPath);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'EXDEV') throw err;
    await fs.copyFile(sourcePath, destPath);
    await unlinkIfExists(sourcePath);
  }
}

export type MirrorToDiskOptions = {
  fieldKey?: string;
  skipDbUpdate?: boolean;
  loanApplicationId?: number;
  /** 1-based index for multi-file fields (salarySlips, otherDocs, …). */
  multiIndex?: number;
};

export type MirrorToDiskResult = {
  ok: boolean;
  destPath?: string;
  url?: string;
  error?: string;
};

type MirrorContext = {
  file: {
    id: number;
    hash?: string | null;
    ext?: string | null;
    name?: string | null;
    mime?: string | null;
    url?: string | null;
    formats?: unknown;
  };
  leadFolder: string;
  targetDir: string;
  fieldKey?: string;
  destPath: string;
  destFilename: string;
  publicUrl: string;
};

async function loadMirrorContext(
  strapi: Core.Strapi,
  fileId: number,
  options: MirrorToDiskOptions
): Promise<MirrorContext | { error: string }> {
  const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { id: fileId },
  });

  if (!file) {
    return { error: 'File record not found' };
  }

  const inScope = await isFileInApiUploadsScope(strapi, file);
  if (!inScope) {
    return { error: 'File not in API Uploads scope' };
  }

  const leadFolder = await resolveLeadFolderNameFromFile(strapi, file);
  if (!leadFolder) {
    return { error: 'Could not resolve lead folder' };
  }

  const targetDir = getLeadDiskDir(leadFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const fieldKey = options.fieldKey;
  const originalName = combineUploadName(file.name, file.ext, file.mime);
  const destPath = resolveDestPath(
    targetDir,
    fieldKey,
    originalName,
    options.multiIndex,
    file.mime
  );
  const destFilename = path.basename(destPath);
  const publicUrl = toPublicUrl(leadFolder, destFilename);

  return {
    file,
    leadFolder,
    targetDir,
    fieldKey,
    destPath,
    destFilename,
    publicUrl,
  };
}

async function collectDiskCandidatePaths(ctx: MirrorContext): Promise<string[]> {
  const { file, leadFolder, targetDir, fieldKey, destPath } = ctx;
  const seen = new Set<string>();
  const paths: string[] = [];

  const add = (candidate: string) => {
    const resolved = path.resolve(candidate);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      paths.push(resolved);
    }
  };

  add(destPath);

  if (file.url?.includes(`/api_uploads/${leadFolder}/`)) {
    add(diskPathFromPublicUrl(file.url));
  }

  if (file.name) {
    add(path.join(targetDir, sanitizeFilename(file.name)));
  }

  if (file.hash) {
    add(path.join(targetDir, `${file.hash}${file.ext ?? ''}`));
  }

  if (fieldKey === 'cibilReport') {
    try {
      const entries = await fs.readdir(targetDir);
      for (const entry of entries) {
        const lower = entry.toLowerCase();
        if (lower.endsWith('.pdf') && (lower.includes('cibil') || entry === CIBIL_REPORT_FILENAME)) {
          add(path.join(targetDir, entry));
        }
      }
    } catch {
      // empty or missing folder
    }
  }

  return paths;
}

async function removeStaleMlDuplicates(
  strapi: Core.Strapi,
  leadFolder: string,
  keepFileId: number,
  destFilename: string
): Promise<void> {
  const leadMlFolder = await ensureMediaLeadFolder(strapi, leadFolder);
  if (!leadMlFolder?.id) return;

  const mlFiles = await strapi.db.query(UPLOAD_FILE_UID).findMany({
    where: { folder: leadMlFolder.id },
  });

  for (const dup of mlFiles) {
    if (Number(dup.id) === keepFileId) continue;

    const name = String(dup.name ?? '');
    if (name !== destFilename) continue;

    try {
      await strapi.plugin('upload').service('upload').remove(dup);
      strapi.log.info(
        `[ApiUploadsMirror] Removed stale ML duplicate ${dup.id} (${name})`
      );
    } catch {
      // non-fatal
    }
  }
}

async function archiveMlFileRecord(
  strapi: Core.Strapi,
  fileId: number,
  leadFolder: string,
  archiveFilename: string
): Promise<void> {
  const publicUrl = toPublicUrl(leadFolder, archiveFilename);
  const ext = path.extname(archiveFilename);
  await strapi.entityService.update(UPLOAD_FILE_UID, fileId, {
    data: {
      name: archiveFilename,
      url: publicUrl,
      ext: ext || null,
      formats: null,
    },
  });
}

async function archiveDiskFile(
  leadFolder: string,
  sourceFilename: string,
  archiveFilename: string
): Promise<void> {
  const targetDir = getLeadDiskDir(leadFolder);
  const sourcePath = path.join(targetDir, sourceFilename);
  const destPath = path.join(targetDir, archiveFilename);

  const diskGuard = `disk:${leadFolder}/${sourceFilename}:delete`;
  await withMirrorGuard(diskGuard, async () => {
    try {
      await fs.access(sourcePath);
      await fs.rename(sourcePath, destPath);
    } catch {
      // source missing
    }
  });
}

async function archiveMorphOrphansForField(
  strapi: Core.Strapi,
  loanApplicationId: number,
  fieldKey: string,
  keepFileIds: Set<number>,
  leadFolder: string,
  existingNames: string[]
): Promise<string[]> {
  const names = [...existingNames];
  try {
    const knex = strapi.db.connection;
    const hasTable = await knex.schema.hasTable('files_related_mph');
    if (!hasTable) return names;

    const rows = await knex('files_related_mph')
      .where({
        related_id: loanApplicationId,
        related_type: LOAN_APP_UID,
        field: fieldKey,
      })
      .select('file_id');

    for (const row of rows) {
      const fileId = Number(row.file_id);
      if (!Number.isFinite(fileId) || keepFileIds.has(fileId)) continue;

      const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
        where: { id: fileId },
      });
      if (!file) continue;

      const fileLeadFolder = await resolveLeadFolderNameFromFile(strapi, file);
      if (fileLeadFolder !== leadFolder) continue;

      const sourceName = String(file.name ?? '');
      if (!shouldArchiveFieldOccupier(fieldKey, sourceName)) continue;

      const archiveName = resolveNextFieldArchiveFilename(fieldKey, sourceName, names);
      if (!archiveName || archiveName === sourceName) continue;

      await archiveDiskFile(leadFolder, sourceName, archiveName);
      await archiveMlFileRecord(strapi, fileId, leadFolder, archiveName);
      names.push(archiveName);
      strapi.log.info(
        `[ApiUploadsMirror] Archived morph prior file ${fileId}: ${sourceName} → ${archiveName}`
      );
    }
  } catch {
    // non-fatal
  }
  return names;
}

export type CleanupFieldDocumentsOptions = {
  leadFolder: string;
  fieldKey: string;
  keepFileIds?: number[];
  loanApplicationId?: number;
  /** @deprecated use exceptDestFilenames */
  exceptDestFilename?: string;
  exceptDestFilenames?: string[];
};

function resolveExceptDestFilenames(options: CleanupFieldDocumentsOptions): Set<string> {
  const names = new Set<string>();
  if (options.exceptDestFilename) names.add(options.exceptDestFilename);
  for (const name of options.exceptDestFilenames ?? []) {
    if (name) names.add(name);
  }
  return names;
}

/** Archive prior canonical-slot files to fieldname_1, fieldname_2, … (single-file fields). */
export async function cleanupFieldDocumentsForLead(
  strapi: Core.Strapi,
  options: CleanupFieldDocumentsOptions
): Promise<void> {
  const { leadFolder, fieldKey } = options;
  if (!fieldKey || fieldKey === 'cibilReport') return;
  if (!isSingleFileDocumentField(fieldKey)) return;

  const keepFileIds = new Set(
    (options.keepFileIds ?? []).filter((id) => Number.isFinite(id) && id > 0)
  );
  const exceptDestFilenames = resolveExceptDestFilenames(options);
  const targetDir = getLeadDiskDir(leadFolder);

  let existingNames: string[] = [];
  try {
    existingNames = await fs.readdir(targetDir);
  } catch {
    existingNames = [];
  }

  const archivedTo = new Map<string, string>();

  for (const entry of [...existingNames]) {
    if (exceptDestFilenames.has(entry)) continue;
    if (!shouldArchiveFieldOccupier(fieldKey, entry)) continue;

    const archiveName = resolveNextFieldArchiveFilename(fieldKey, entry, existingNames);
    if (!archiveName || archiveName === entry) continue;

    await archiveDiskFile(leadFolder, entry, archiveName);
    archivedTo.set(entry, archiveName);
    existingNames = existingNames.filter((n) => n !== entry);
    existingNames.push(archiveName);
    strapi.log.info(
      `[ApiUploadsMirror] Archived prior disk file ${entry} → ${archiveName} for field ${fieldKey}`
    );
  }

  const leadMlFolder = await ensureMediaLeadFolder(strapi, leadFolder);
  if (leadMlFolder?.id) {
    const mlFiles = await strapi.db.query(UPLOAD_FILE_UID).findMany({
      where: { folder: leadMlFolder.id },
    });

    for (const ml of mlFiles) {
      if (keepFileIds.has(Number(ml.id))) continue;
      const name = String(ml.name ?? '');
      if (exceptDestFilenames.has(name)) continue;
      if (!shouldArchiveFieldOccupier(fieldKey, name)) continue;

      const priorArchive = archivedTo.get(name);
      if (priorArchive) {
        await archiveMlFileRecord(strapi, Number(ml.id), leadFolder, priorArchive);
        continue;
      }

      const archiveName = resolveNextFieldArchiveFilename(fieldKey, name, existingNames);
      if (!archiveName || archiveName === name) continue;

      await archiveDiskFile(leadFolder, name, archiveName);
      await archiveMlFileRecord(strapi, Number(ml.id), leadFolder, archiveName);
      archivedTo.set(name, archiveName);
      existingNames.push(archiveName);
      strapi.log.info(
        `[ApiUploadsMirror] Archived prior ML file ${ml.id} (${name}) → ${archiveName} for field ${fieldKey}`
      );
    }
  }

  if (options.loanApplicationId) {
    await archiveMorphOrphansForField(
      strapi,
      options.loanApplicationId,
      fieldKey,
      keepFileIds,
      leadFolder,
      existingNames
    );
  }
}

async function cleanupPriorSingleFieldFiles(
  strapi: Core.Strapi,
  ctx: MirrorContext,
  options: MirrorToDiskOptions,
  keepFileId: number
): Promise<void> {
  await cleanupFieldDocumentsForLead(strapi, {
    leadFolder: ctx.leadFolder,
    fieldKey: ctx.fieldKey!,
    keepFileIds: [keepFileId],
    loanApplicationId: options.loanApplicationId,
    exceptDestFilename: ctx.destFilename,
  });
}

async function hashSourceExists(file: { hash?: string | null; ext?: string | null }): Promise<boolean> {
  if (!file.hash) return false;
  const hashSourcePath = path.join(
    process.cwd(),
    'public',
    'uploads',
    `${file.hash}${file.ext ?? ''}`
  );
  try {
    await fs.access(hashSourcePath);
    return true;
  } catch {
    return false;
  }
}

async function updateUploadFileCanonical(
  strapi: Core.Strapi,
  fileId: number,
  leadFolder: string,
  destFilename: string,
  skipDbUpdate?: boolean
): Promise<void> {
  if (skipDbUpdate) return;

  const publicUrl = toPublicUrl(leadFolder, destFilename);
  await strapi.entityService.update(UPLOAD_FILE_UID, fileId, {
    data: {
      url: publicUrl,
      formats: null,
      name: destFilename,
    },
  });
}

async function normalizeCibilOnDisk(
  strapi: Core.Strapi,
  fileId: number,
  ctx: MirrorContext,
  existingPath: string,
  options: MirrorToDiskOptions
): Promise<MirrorToDiskResult> {
  const filename = path.basename(existingPath);

  if (ctx.fieldKey === 'cibilReport') {
    const leadId = parseLeadIdFromFolderName(ctx.leadFolder);
    const applicantName = parseApplicantNameFromFolderName(ctx.leadFolder);
    if (leadId) {
      const promoted = await promoteCanonicalCibilReportOnDisk(leadId, applicantName, {
        preferredPath: existingPath,
      });
      if (promoted.path) {
        const canonicalUrl = toPublicUrl(ctx.leadFolder, CIBIL_REPORT_FILENAME);
        await updateUploadFileCanonical(
          strapi,
          fileId,
          ctx.leadFolder,
          CIBIL_REPORT_FILENAME,
          options.skipDbUpdate
        );
        return {
          ok: true,
          destPath: promoted.path,
          url: canonicalUrl,
        };
      }
    }
  }

  return {
    ok: true,
    destPath: existingPath,
    url: toPublicUrl(ctx.leadFolder, filename),
  };
}

async function findExistingMirroredOnDisk(
  strapi: Core.Strapi,
  fileId: number,
  ctx: MirrorContext,
  options: MirrorToDiskOptions
): Promise<MirrorToDiskResult | null> {
  for (const candidate of await collectDiskCandidatePaths(ctx)) {
    try {
      await fs.access(candidate);
      return normalizeCibilOnDisk(strapi, fileId, ctx, candidate, options);
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function queueCibilIfNeeded(
  strapi: Core.Strapi,
  ctx: MirrorContext,
  options: MirrorToDiskOptions,
  destFilename: string,
  preferredDiskPath?: string
): Promise<void> {
  const isCibil =
    ctx.fieldKey === 'cibilReport' || destFilename.toLowerCase().includes('cibil');
  if (!isCibil) return;

  const leadId = parseLeadIdFromFolderName(ctx.leadFolder);
  const applicantName = parseApplicantNameFromFolderName(ctx.leadFolder);
  if (!leadId) return;

  await maybeQueueBureauForDiskFile(
    strapi,
    ctx.leadFolder,
    CIBIL_REPORT_FILENAME,
    options.loanApplicationId,
    {
      preferredDiskPath,
      preserveFileIds: [ctx.file.id],
      skipMlSync: ctx.fieldKey !== 'cibilReport',
    }
  );
}

async function performMirrorMove(
  strapi: Core.Strapi,
  fileId: number,
  ctx: MirrorContext,
  options: MirrorToDiskOptions
): Promise<MirrorToDiskResult> {
  const { file, leadFolder, destPath, destFilename, publicUrl } = ctx;
  const diskGuard = `disk:${leadFolder}/${destFilename}`;
  const isCibilDest = ctx.fieldKey === 'cibilReport';

  const inner = await withMirrorGuard(diskGuard, async () => {
    if (
      !isCibilDest &&
      ctx.fieldKey &&
      isSingleFileDocumentField(ctx.fieldKey)
    ) {
      await cleanupPriorSingleFieldFiles(strapi, ctx, options, fileId);
    }

    if (
      !isCibilDest &&
      file.url?.includes(`/api_uploads/${leadFolder}/`) &&
      file.url.endsWith(`/${destFilename}`)
    ) {
      try {
        await fs.access(destPath);
        await removeStaleMlDuplicates(strapi, leadFolder, fileId, destFilename);
        return { ok: true as const, destPath, url: file.url };
      } catch {
        // fall through — url points to missing file
      }
    }

    const hashSourcePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      `${file.hash}${file.ext}`
    );

    let moved = false;
    const destAlreadyExists = await fs
      .access(destPath)
      .then(() => true)
      .catch(() => false);
    const useAtomic = isCibilDest || destAlreadyExists;

    try {
      await fs.access(hashSourcePath);
      await moveFile(hashSourcePath, destPath, useAtomic);
      moved = true;
    } catch {
      if (file.url) {
        const currentDiskPath = diskPathFromPublicUrl(file.url);
        try {
          await fs.access(currentDiskPath);
          if (path.resolve(currentDiskPath) !== path.resolve(destPath)) {
            await moveFile(currentDiskPath, destPath, useAtomic);
            moved = true;
          } else if (!isCibilDest) {
            moved = true;
          }
        } catch {
          // not found at url path
        }
      }
    }

    if (!moved) {
      const existing = await findExistingMirroredOnDisk(strapi, fileId, ctx, options);
      if (existing?.ok) {
        return existing;
      }
      return { ok: false as const, error: 'Source file not found on disk' };
    }

    try {
      await fs.access(destPath);
    } catch {
      return { ok: false as const, error: 'Destination file missing after mirror move' };
    }

    await removeFormatFilesFromDisk(file.formats);

    await updateUploadFileCanonical(
      strapi,
      fileId,
      leadFolder,
      destFilename,
      options.skipDbUpdate
    );

    await removeStaleMlDuplicates(strapi, leadFolder, fileId, destFilename);

    strapi.log.info(
      `[ApiUploadsMirror] Mirrored file ${fileId} → ${destPath}`
    );

    return { ok: true as const, destPath, url: publicUrl };
  });

  if (inner?.ok) {
    await queueCibilIfNeeded(
      strapi,
      ctx,
      options,
      path.basename(inner.destPath ?? destFilename),
      inner.destPath
    );
    return inner;
  }

  if (inner && !inner.ok) {
    return inner;
  }

  const existing = await findExistingMirroredOnDisk(strapi, fileId, ctx, options);
  if (existing?.ok) {
    await queueCibilIfNeeded(
      strapi,
      ctx,
      options,
      path.basename(existing.destPath ?? destFilename),
      existing.destPath
    );
    return existing;
  }

  return { ok: false, error: 'Mirror guard active' };
}

export async function mirrorFileToDisk(
  strapi: Core.Strapi,
  fileId: number,
  options: MirrorToDiskOptions = {}
): Promise<MirrorToDiskResult> {
  const ctx = await loadMirrorContext(strapi, fileId, options);
  if ('error' in ctx) {
    return { ok: false, error: ctx.error };
  }

  const isCibilReupload = ctx.fieldKey === 'cibilReport';

  if (ctx.fieldKey && isSingleFileDocumentField(ctx.fieldKey)) {
    await cleanupFieldDocumentsForLead(strapi, {
      leadFolder: ctx.leadFolder,
      fieldKey: ctx.fieldKey,
      keepFileIds: [fileId],
      loanApplicationId: options.loanApplicationId,
      exceptDestFilename: ctx.destFilename,
    });
  }

  const alreadyMirrored = await findExistingMirroredOnDisk(strapi, fileId, ctx, options);
  if (alreadyMirrored && !isCibilReupload) {
    const hasFreshHash = await hashSourceExists(ctx.file);
    const urlOnDest =
      ctx.file.url?.includes(`/api_uploads/${ctx.leadFolder}/`) &&
      ctx.file.url.endsWith(`/${ctx.destFilename}`);
    if (!hasFreshHash && urlOnDest) {
      await queueCibilIfNeeded(
        strapi,
        ctx,
        options,
        path.basename(alreadyMirrored.destPath ?? ctx.destFilename),
        alreadyMirrored.destPath
      );
      return alreadyMirrored;
    }
  }

  const guardKey = `ml:file:${fileId}`;

  for (let attempt = 0; attempt < GUARD_RETRY_ATTEMPTS; attempt += 1) {
    const result = await withMirrorGuard(guardKey, async () =>
      performMirrorMove(strapi, fileId, ctx, options)
    );

    if (result !== null) {
      return result;
    }

    const existing = await findExistingMirroredOnDisk(strapi, fileId, ctx, options);
    if (existing && !isCibilReupload) {
      await queueCibilIfNeeded(
        strapi,
        ctx,
        options,
        path.basename(existing.destPath ?? ctx.destFilename),
        existing.destPath
      );
      return existing;
    }

    if (attempt < GUARD_RETRY_ATTEMPTS - 1) {
      await sleep(GUARD_RETRY_BASE_MS * (attempt + 1));
    }
  }

  const finalCheck = await findExistingMirroredOnDisk(strapi, fileId, ctx, options);
  if (finalCheck && !isCibilReupload) {
    await queueCibilIfNeeded(
      strapi,
      ctx,
      options,
      path.basename(finalCheck.destPath ?? ctx.destFilename),
      finalCheck.destPath
    );
    return finalCheck;
  }

  return { ok: false, error: 'Mirror guard active' };
}

export async function mirrorLeadDocumentsToDisk(
  strapi: Core.Strapi,
  leadFolderName: string,
  fileIds: Iterable<number>,
  fileFieldById: Record<number, string> = {},
  options: { loanApplicationId?: number } = {}
) {
  const targetDir = getLeadDiskDir(leadFolderName);
  await fs.mkdir(targetDir, { recursive: true });

  const results: Array<{
    fileId: number;
    ok: boolean;
    destPath?: string;
    url?: string;
    fieldKey?: string;
    error?: string;
  }> = [];

  const multiCounts: Record<string, number> = {};

  for (const fileId of fileIds) {
    const fieldKey = fileFieldById[fileId];
    let multiIndex: number | undefined;
    if (fieldKey && MULTI_FILE_DOCUMENT_FIELDS.has(fieldKey)) {
      multiCounts[fieldKey] = (multiCounts[fieldKey] ?? 0) + 1;
      multiIndex = multiCounts[fieldKey];
    }
    const result = await mirrorFileToDisk(strapi, fileId, {
      fieldKey,
      multiIndex,
      loanApplicationId: options.loanApplicationId,
    });
    results.push({
      fileId,
      ok: result.ok,
      destPath: result.destPath,
      url: result.url,
      fieldKey,
      error: result.error,
    });
  }

  return { folderName: leadFolderName, targetDir, results };
}
