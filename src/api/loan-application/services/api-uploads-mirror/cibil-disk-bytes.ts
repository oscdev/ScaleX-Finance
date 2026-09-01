import fs from 'fs/promises';
import path from 'path';
import type { Core } from '@strapi/strapi';
import { CIBIL_REPORT_FILENAME } from '../queue-bureau-extraction';
import { resolveCibilFileIdFromMorph } from '../cibil-lifecycle-sync';
import { UPLOAD_FILE_UID } from './constants';
import { diskPathFromPublicUrl, getLeadDiskDir, parseDiskRelPath } from './paths';

const LOAN_APP_UID = 'api::loan-application.loan-application';

function parseLeadIdFromFolder(folderName: string): number | null {
  const match = folderName.match(/^(\d+)-/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function resolveLoanAppId(
  strapi: Core.Strapi,
  leadId: number
): Promise<number | undefined> {
  const loanApp = await strapi.db.query(LOAN_APP_UID).findOne({
    where: { leadId: String(leadId) },
    orderBy: { id: 'desc' },
    select: ['id'],
  });
  return loanApp?.id;
}

function isCibilCanonicalFile(file: {
  name?: string | null;
  url?: string | null;
}): boolean {
  const name = String(file.name ?? '').toLowerCase();
  const url = String(file.url ?? '').toLowerCase();
  return (
    name === CIBIL_REPORT_FILENAME ||
    (name.endsWith('.pdf') && name.includes('cibil')) ||
    url.includes('cibil_report.pdf')
  );
}

/** Skip disk unlink when Strapi replaces CIBIL — new morph row already points elsewhere. */
export async function shouldDeferCibilDiskDelete(
  strapi: Core.Strapi,
  file: { id: number; name?: string | null; url?: string | null }
): Promise<boolean> {
  if (!isCibilCanonicalFile(file)) return false;

  const rel = file.url ? parseDiskRelPath(diskPathFromPublicUrl(file.url)) : null;
  const leadFolder = rel?.leadFolder;
  if (!leadFolder) return false;

  const leadId = parseLeadIdFromFolder(leadFolder);
  if (!leadId) return false;

  const loanAppId = await resolveLoanAppId(strapi, leadId);
  if (!loanAppId) return false;

  const linkedId = await resolveCibilFileIdFromMorph(strapi, loanAppId);
  if (linkedId != null && linkedId !== file.id) {
    return true;
  }

  return false;
}

/** Atomic write: copy source → dest.tmp → rename over dest (never unlinks dest until tmp exists). */
export async function atomicCopyToPath(sourcePath: string, destPath: string): Promise<void> {
  const tmpPath = `${destPath}.tmp`;
  await fs.copyFile(sourcePath, tmpPath);
  await fs.rename(tmpPath, destPath);
}

async function resolveHashSourcePath(file: {
  hash?: string | null;
  ext?: string | null;
}): Promise<string | null> {
  if (!file.hash) return null;
  const hashPath = path.join(
    process.cwd(),
    'public',
    'uploads',
    `${file.hash}${file.ext ?? ''}`
  );
  try {
    await fs.access(hashPath);
    return hashPath;
  } catch {
    return null;
  }
}

/**
 * Ensure cibil_report.pdf exists on disk for a Media Library upload row.
 * Copies from hash storage when the canonical path is missing.
 */
export async function ensureCibilReportBytesOnDisk(
  strapi: Core.Strapi,
  fileId: number,
  leadFolderName: string
): Promise<boolean> {
  const canonicalPath = path.join(getLeadDiskDir(leadFolderName), CIBIL_REPORT_FILENAME);
  try {
    await fs.access(canonicalPath);
    return true;
  } catch {
    // need to copy from upload storage
  }

  const file = await strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { id: fileId },
  });
  if (!file) return false;

  await fs.mkdir(path.dirname(canonicalPath), { recursive: true });

  const hashPath = await resolveHashSourcePath(file);
  if (hashPath) {
    await atomicCopyToPath(hashPath, canonicalPath);
    return true;
  }

  if (file.url?.includes(`/api_uploads/${leadFolderName}/`)) {
    const urlPath = diskPathFromPublicUrl(file.url);
    if (urlPath !== canonicalPath) {
      try {
        await fs.access(urlPath);
        await atomicCopyToPath(urlPath, canonicalPath);
        return true;
      } catch {
        // not at url path
      }
    }
  }

  try {
    await fs.access(canonicalPath);
    return true;
  } catch {
    return false;
  }
}

export async function cibilCanonicalExistsOnDisk(leadFolderName: string): Promise<boolean> {
  const canonicalPath = path.join(getLeadDiskDir(leadFolderName), CIBIL_REPORT_FILENAME);
  try {
    await fs.access(canonicalPath);
    return true;
  } catch {
    return false;
  }
}
