import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Core } from '@strapi/strapi';
import {
  buildLeadUploadFolderName,
  getLeadUploadDiskDir,
} from '../utils/lead-upload-folder';
import { resolveLeadLoanTypeFromDb, bureauLogModule, resetModuleLeadLog } from '../../../utils/code-file-logger';

export const CIBIL_REPORT_FILENAME = 'cibil_report.pdf';

const CIBIL_SUMMARY_UID = 'api::bureau-data-extraction.cibil-report-summary';
const EXTRACTION_META_KEY = '_extractionMeta';

export type CibilExtractionMeta = {
  sourcePdfMtimeMs: number;
  sourcePdfRelPath: string;
};

export type BureauExtractionParams = {
  leadId: number | string;
  applicantName: string;
  loanApplicationId?: number;
  loanType?: string | null;
};

export function buildCibilReportRelPath(
  leadId: number | string,
  applicantName: string
): string {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  return `${folderName}/${CIBIL_REPORT_FILENAME}`;
}

function isCibilPdfFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.pdf') && lower.includes('cibil');
}

async function listCibilPdfPaths(dir: string): Promise<Array<{ path: string; mtimeMs: number }>> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const out: Array<{ path: string; mtimeMs: number }> = [];
  for (const entry of entries) {
    if (!isCibilPdfFilename(entry)) continue;
    const full = path.join(dir, entry);
    try {
      const stat = await fs.stat(full);
      if (stat.isFile()) {
        out.push({ path: full, mtimeMs: stat.mtimeMs });
      }
    } catch {
      // skip unreadable
    }
  }
  return out;
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // already removed
  }
}

async function copyToCanonical(source: string, canonical: string): Promise<void> {
  const sourceResolved = path.resolve(source);
  const canonicalResolved = path.resolve(canonical);
  if (sourceResolved === canonicalResolved) return;

  const tmpPath = `${canonical}.tmp`;
  await fs.copyFile(source, tmpPath);
  await fs.rename(tmpPath, canonical);
  if (sourceResolved !== canonicalResolved) {
    await unlinkIfExists(source);
  }
}

export type PromoteCanonicalCibilResult = {
  path: string | null;
  replaced: boolean;
};

/**
 * Promote the newest (or preferred) CIBIL PDF to cibil_report.pdf and remove alternates.
 */
export async function promoteCanonicalCibilReportOnDisk(
  leadId: number | string,
  applicantName: string,
  opts: { preferredPath?: string } = {}
): Promise<PromoteCanonicalCibilResult> {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  const dir = getLeadUploadDiskDir(folderName);
  const canonical = path.join(dir, CIBIL_REPORT_FILENAME);

  const cibilFiles = await listCibilPdfPaths(dir);
  if (!cibilFiles.length) {
    return { path: null, replaced: false };
  }

  let sourcePath: string | null = null;
  if (opts.preferredPath) {
    const resolved = path.resolve(opts.preferredPath);
    const match = cibilFiles.find((f) => path.resolve(f.path) === resolved);
    if (match) sourcePath = match.path;
  }

  if (!sourcePath) {
    const newest = cibilFiles.reduce((a, b) => (b.mtimeMs >= a.mtimeMs ? b : a));
    sourcePath = newest.path;
  }

  const sourceResolved = path.resolve(sourcePath);
  const canonicalResolved = path.resolve(canonical);
  let replaced = false;

  if (sourceResolved !== canonicalResolved) {
    await copyToCanonical(sourcePath, canonical);
    replaced = true;
  }

  for (const { path: filePath } of cibilFiles) {
    const resolved = path.resolve(filePath);
    if (resolved !== canonicalResolved) {
      await unlinkIfExists(resolved);
    }
  }

  try {
    await fs.access(canonical);
    return { path: canonical, replaced };
  } catch {
    return { path: null, replaced: false };
  }
}

export async function ensureCanonicalCibilReportOnDisk(
  leadId: number | string,
  applicantName: string
): Promise<string | null> {
  const result = await promoteCanonicalCibilReportOnDisk(leadId, applicantName);
  return result.path;
}

export async function cibilReportExists(
  leadId: number | string,
  applicantName: string
): Promise<boolean> {
  return (await ensureCanonicalCibilReportOnDisk(leadId, applicantName)) != null;
}

export async function getCibilPdfMtimeMs(
  leadId: number | string,
  applicantName: string
): Promise<{ path: string; mtimeMs: number; relPath: string } | null> {
  const pdfPath = await ensureCanonicalCibilReportOnDisk(leadId, applicantName);
  if (!pdfPath) return null;

  try {
    const stat = await fs.stat(pdfPath);
    return {
      path: pdfPath,
      mtimeMs: stat.mtimeMs,
      relPath: buildCibilReportRelPath(leadId, applicantName),
    };
  } catch {
    return null;
  }
}

function hasMeaningfulCibilData(cibilData: Record<string, unknown>): boolean {
  const keys = Object.keys(cibilData).filter((k) => k !== EXTRACTION_META_KEY);
  if (!keys.length) return false;
  return keys.some((k) => {
    const val = cibilData[k];
    if (val == null) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val as object).length > 0;
    return true;
  });
}

function readExtractionMeta(
  cibilData: Record<string, unknown> | null | undefined
): CibilExtractionMeta | null {
  const meta = cibilData?.[EXTRACTION_META_KEY];
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const sourcePdfMtimeMs = Number((meta as CibilExtractionMeta).sourcePdfMtimeMs);
  const sourcePdfRelPath = String((meta as CibilExtractionMeta).sourcePdfRelPath ?? '');
  if (!Number.isFinite(sourcePdfMtimeMs) || !sourcePdfRelPath) return null;
  return { sourcePdfMtimeMs, sourcePdfRelPath };
}

async function backfillExtractionMeta(
  strapi: Core.Strapi,
  leadId: number,
  cibilData: Record<string, unknown>,
  mtimeMs: number,
  relPath: string
): Promise<void> {
  const existing = await strapi.db.query(CIBIL_SUMMARY_UID).findOne({ where: { leadId } });
  if (!existing?.id) return;

  await strapi.db.query(CIBIL_SUMMARY_UID).update({
    where: { id: existing.id },
    data: {
      cibilData: {
        ...cibilData,
        [EXTRACTION_META_KEY]: {
          sourcePdfMtimeMs: mtimeMs,
          sourcePdfRelPath: relPath,
        } satisfies CibilExtractionMeta,
      },
    },
  });
}

/** Skip auto-queue when PDF_EXTRACTION data exists and source PDF mtime is unchanged. */
export async function shouldSkipBureauExtraction(
  strapi: Core.Strapi,
  leadId: number | string,
  applicantName: string
): Promise<boolean> {
  const pdf = await getCibilPdfMtimeMs(leadId, applicantName);
  if (!pdf) return false;

  const leadIdNum = Number(leadId);
  if (!Number.isFinite(leadIdNum)) return false;

  const existing = (await strapi.db.query(CIBIL_SUMMARY_UID).findOne({
    where: { leadId: leadIdNum },
  })) as {
    cibilData?: Record<string, unknown> | null;
    dataSource?: string | null;
  } | null;

  if (!existing?.cibilData || existing.dataSource !== 'PDF_EXTRACTION') {
    return false;
  }

  const cibilData = existing.cibilData as Record<string, unknown>;
  if (!hasMeaningfulCibilData(cibilData)) return false;

  const storedMeta = readExtractionMeta(cibilData);
  if (storedMeta?.sourcePdfMtimeMs === pdf.mtimeMs) {
    return true;
  }

  if (!storedMeta) {
    await backfillExtractionMeta(strapi, leadIdNum, cibilData, pdf.mtimeMs, pdf.relPath);
    return true;
  }

  return false;
}

export function withExtractionMeta(
  cibilData: Record<string, unknown>,
  meta: CibilExtractionMeta
): Record<string, unknown> {
  return {
    ...cibilData,
    [EXTRACTION_META_KEY]: meta,
  };
}

async function logBureau(
  strapi: Core.Strapi,
  params: {
    action: string;
    description: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    leadId: number;
    leadName: string;
    correlationId: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    const logger: any = strapi.service('api::activity-log.activity-log');
    if (!logger?.logEventDeduped) return;
    await logger.logEventDeduped({
      action: params.action,
      description: params.description,
      severity: params.severity || 'info',
      model: 'api::bureau-data-extraction.cibil-report-summary',
      leadId: params.leadId,
      leadName: params.leadName,
      correlationId: params.correlationId,
      metadata: {
        leadId: params.leadId,
        leadName: params.leadName,
        runId: params.correlationId,
        ...(params.metadata || {}),
      },
    });
  } catch {
    // non-fatal
  }
}

const scheduledExtractions = new Set<number>();

async function executeBureauExtraction(
  strapi: Core.Strapi,
  params: BureauExtractionParams
): Promise<void> {
  const leadIdNum = Number(params.leadId);
  const cibilRelPath = buildCibilReportRelPath(params.leadId, params.applicantName);
  const correlationId = randomUUID();

  try {
    await promoteCanonicalCibilReportOnDisk(params.leadId, params.applicantName);

    const hasCibil = await cibilReportExists(params.leadId, params.applicantName);
    if (!hasCibil) {
      strapi.log.warn(
        `[Bureau Auto] Skipping — ${cibilRelPath} not found in api_uploads`
      );
      return;
    }

    if (await shouldSkipBureauExtraction(strapi, params.leadId, params.applicantName)) {
      strapi.log.info(
        `[Bureau Auto] Skipping extraction for ${cibilRelPath} — PDF unchanged since last extract`
      );
      return;
    }

    const loanType = await resolveLeadLoanTypeFromDb(strapi, leadIdNum, {
      loanApplicationId: params.loanApplicationId,
      loanType: params.loanType,
    });

    resetModuleLeadLog(bureauLogModule(loanType), {
      leadId: leadIdNum,
      leadName: params.applicantName,
    });

    strapi.log.info(
      `[Bureau Auto] START extraction for ${cibilRelPath} (loanType=${loanType ?? 'Personal Loan default'})`
    );
    await logBureau(strapi, {
      action: 'BUREAU_EXTRACT_STARTED',
      description: `Bureau extraction started for ${cibilRelPath}`,
      leadId: leadIdNum,
      leadName: params.applicantName,
      correlationId,
      metadata: {
        loanApplicationId: params.loanApplicationId ?? null,
        loanType: loanType ?? null,
        file: cibilRelPath,
      },
    });

    const service = strapi.service(
      'api::bureau-data-extraction.cibil-report-summary'
    ) as {
      runExtraction: (args: {
        leadId: number;
        leadName: string;
        loanApplicationId?: number;
        loanType?: string | null;
        dataSource: string;
      }) => Promise<unknown>;
    };

    await service.runExtraction({
      leadId: leadIdNum,
      leadName: params.applicantName,
      loanApplicationId: params.loanApplicationId,
      loanType,
      dataSource: 'PDF_EXTRACTION',
    });

    strapi.log.info(`[Bureau Auto] END extraction for ${cibilRelPath}`);
    await logBureau(strapi, {
      action: 'BUREAU_EXTRACT_COMPLETED',
      description: `Bureau extraction completed for lead ${leadIdNum}`,
      leadId: leadIdNum,
      leadName: params.applicantName,
      correlationId,
      metadata: {
        loanApplicationId: params.loanApplicationId ?? null,
        file: cibilRelPath,
      },
    });
  } catch (err) {
    strapi.log.error(`[Bureau Auto] FAILED extraction for ${cibilRelPath}:`, err);
    await logBureau(strapi, {
      action: 'BUREAU_EXTRACT_FAILED',
      description: `Bureau extraction failed for lead ${leadIdNum}: ${
        err instanceof Error ? err.message : String(err)
      }`,
      severity: 'error',
      leadId: leadIdNum,
      leadName: params.applicantName,
      correlationId,
      metadata: {
        loanApplicationId: params.loanApplicationId ?? null,
        file: cibilRelPath,
      },
    });
  }
}

export function queueBureauExtraction(
  strapi: Core.Strapi,
  params: BureauExtractionParams
): void {
  const leadIdNum = Number(params.leadId);
  if (!Number.isFinite(leadIdNum)) {
    strapi.log.warn('[Bureau Auto] Skipping extraction — invalid leadId');
    return;
  }

  if (scheduledExtractions.has(leadIdNum)) {
    strapi.log.debug(
      `[Bureau Auto] Extraction already queued/running for lead ${leadIdNum} — skipping duplicate queue`
    );
    return;
  }

  scheduledExtractions.add(leadIdNum);

  setImmediate(async () => {
    try {
      await executeBureauExtraction(strapi, params);
    } finally {
      scheduledExtractions.delete(leadIdNum);
    }
  });
}
