import type { Core } from '@strapi/strapi';
import { mirrorDiskFileToMedia } from './mirror-to-media';
import {
  CIBIL_REPORT_FILENAME,
  promoteCanonicalCibilReportOnDisk,
} from '../queue-bureau-extraction';
import { parseApplicantNameFromFolderName, parseLeadIdFromFolderName } from './cibil-hook';

const leadFolderChains = new Map<string, Promise<void>>();

const CONNECTION_RETRY_ATTEMPTS = 3;
const CONNECTION_RETRY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConnectionPoolError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /unable to acquire a connection/i.test(message);
}

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < CONNECTION_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isConnectionPoolError(err) || attempt >= CONNECTION_RETRY_ATTEMPTS - 1) {
        throw err;
      }
      await sleep(CONNECTION_RETRY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

function enqueueLeadFolderWork(leadFolder: string, work: () => Promise<void>): void {
  const previous = leadFolderChains.get(leadFolder) ?? Promise.resolve();
  const next = previous
    .catch(() => {
      // keep chain alive after failure
    })
    .then(work)
    .finally(() => {
      if (leadFolderChains.get(leadFolder) === next) {
        leadFolderChains.delete(leadFolder);
      }
    });
  leadFolderChains.set(leadFolder, next);
}

async function prepareCibilRelPath(relPath: string): Promise<string> {
  const slash = relPath.indexOf('/');
  if (slash < 0) return relPath;

  const leadFolder = relPath.slice(0, slash);
  const filename = relPath.slice(slash + 1);
  if (!filename.toLowerCase().includes('cibil')) {
    return relPath;
  }

  const leadId = parseLeadIdFromFolderName(leadFolder);
  if (!leadId) return `${leadFolder}/${CIBIL_REPORT_FILENAME}`;

  const applicantName = parseApplicantNameFromFolderName(leadFolder);
  await promoteCanonicalCibilReportOnDisk(leadId, applicantName);
  return `${leadFolder}/${CIBIL_REPORT_FILENAME}`;
}

export function queueWatcherMirrorToMedia(
  strapi: Core.Strapi,
  relPath: string,
  onError: (message: string) => void
): void {
  const slash = relPath.indexOf('/');
  const leadFolder = slash >= 0 ? relPath.slice(0, slash) : relPath;

  enqueueLeadFolderWork(leadFolder, async () => {
    try {
      const mirrorRel = await prepareCibilRelPath(relPath);
      await withRetries(() => mirrorDiskFileToMedia(strapi, mirrorRel));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
    }
  });
}
