import type { Core } from '@strapi/strapi';
import { buildLeadUploadFolderName } from '../../utils/lead-upload-folder';
import { resolveMediaFileId } from '../lead-document-sync';
import { resolveCibilFileIdFromMorph } from '../cibil-lifecycle-sync';
import {
  CIBIL_REPORT_FILENAME,
  promoteCanonicalCibilReportOnDisk,
  queueBureauExtraction,
  shouldSkipBureauExtraction,
} from '../queue-bureau-extraction';
import { UPLOAD_FILE_UID } from './constants';
import { ensureMediaLeadFolder } from './folders';
import { toPublicUrl } from './paths';
import {
  cibilCanonicalExistsOnDisk,
  ensureCibilReportBytesOnDisk,
} from './cibil-disk-bytes';

export type BureauDiskFileOpts = {
  preferredDiskPath?: string;
  preserveFileIds?: number[];
  skipMlSync?: boolean;
};

function isCibilPdfName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.pdf') && lower.includes('cibil');
}

async function resolveLinkedCibilFileId(
  strapi: Core.Strapi,
  leadId: number,
  loanApplicationId?: number
): Promise<number | null> {
  const resolvedLoanAppId =
    loanApplicationId ?? (await resolveLoanApplicationId(strapi, leadId));

  if (resolvedLoanAppId != null) {
    const fromMorph = await resolveCibilFileIdFromMorph(strapi, resolvedLoanAppId);
    if (fromMorph) return fromMorph;
  }

  const where =
    loanApplicationId != null
      ? { id: loanApplicationId }
      : { leadId: String(leadId) };

  const loanApp = await strapi.db.query('api::loan-application.loan-application').findOne({
    where,
    orderBy: { id: 'desc' },
    populate: ['cibilReport'],
  });

  if (!loanApp) return null;
  return resolveMediaFileId(loanApp.cibilReport);
}

/**
 * Rename the loan-app linked CIBIL file to cibil_report.pdf in Media Library.
 * Delete only unlinked duplicate CIBIL PDFs in the lead folder.
 */
export async function syncCanonicalCibilMediaFile(
  strapi: Core.Strapi,
  leadFolderName: string,
  loanApplicationId?: number,
  opts: Pick<BureauDiskFileOpts, 'preserveFileIds'> = {}
): Promise<void> {
  const leadId = parseLeadIdFromFolderName(leadFolderName);
  if (!leadId) return;

  const leadMlFolder = await ensureMediaLeadFolder(strapi, leadFolderName);
  if (!leadMlFolder?.id) return;

  const preserve = new Set(opts.preserveFileIds ?? []);
  const linkedFileId = await resolveLinkedCibilFileId(strapi, leadId, loanApplicationId);
  const canonicalUrl = toPublicUrl(leadFolderName, CIBIL_REPORT_FILENAME);

  if (linkedFileId) {
    preserve.add(linkedFileId);

    const bytesOnDisk = await ensureCibilReportBytesOnDisk(
      strapi,
      linkedFileId,
      leadFolderName
    );
    if (!bytesOnDisk) {
      strapi.log.warn(
        `[ApiUploadsMirror] CIBIL canonical bytes missing on disk for lead folder ${leadFolderName} — skipping ML url update`
      );
    } else {
      try {
        await strapi.entityService.update(UPLOAD_FILE_UID, linkedFileId, {
          data: {
            name: CIBIL_REPORT_FILENAME,
            url: canonicalUrl,
            formats: null,
          },
        });
      } catch {
        // non-fatal — file may already be canonical
      }
    }
  }

  const files = await strapi.db.query(UPLOAD_FILE_UID).findMany({
    where: { folder: leadMlFolder.id },
  });

  for (const file of files) {
    const fileId = Number(file.id);
    const name = String(file.name ?? '');
    if (!isCibilPdfName(name)) continue;
    if (preserve.has(fileId)) continue;
    if (fileId === linkedFileId) continue;
    if (name === CIBIL_REPORT_FILENAME && linkedFileId == null) continue;

    try {
      await strapi.plugin('upload').service('upload').remove(file);
    } catch {
      // non-fatal
    }
  }
}

export function parseLeadIdFromFolderName(folderName: string): number | null {
  const match = folderName.match(/^(\d+)-/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function parseApplicantNameFromFolderName(folderName: string): string {
  const dash = folderName.indexOf('-');
  if (dash < 0) return folderName;
  return folderName.slice(dash + 1);
}

export async function resolveLoanApplicationId(
  strapi: Core.Strapi,
  leadId: number | string
): Promise<number | undefined> {
  const loanApp = await strapi.db.query('api::loan-application.loan-application').findOne({
    where: { leadId: String(leadId) },
    orderBy: { id: 'desc' },
    select: ['id'],
  });
  return loanApp?.id;
}

export async function maybeQueueBureauForDiskFile(
  strapi: Core.Strapi,
  leadFolderName: string,
  filename: string,
  loanApplicationId?: number,
  opts: BureauDiskFileOpts = {}
): Promise<void> {
  const leadId = parseLeadIdFromFolderName(leadFolderName);
  if (!leadId) {
    strapi.log.warn(
      `[ApiUploadsMirror] CIBIL file in ${leadFolderName} — could not parse leadId`
    );
    return;
  }

  const applicantName = parseApplicantNameFromFolderName(leadFolderName);
  const isCibilFile =
    filename === CIBIL_REPORT_FILENAME ||
    filename.toLowerCase().includes('cibil');
  if (!isCibilFile) return;

  const resolvedLoanAppId =
    loanApplicationId ?? (await resolveLoanApplicationId(strapi, leadId));

  if (!(await cibilCanonicalExistsOnDisk(leadFolderName))) {
    const linkedId = await resolveLinkedCibilFileId(strapi, leadId, resolvedLoanAppId);
    if (linkedId) {
      await ensureCibilReportBytesOnDisk(strapi, linkedId, leadFolderName);
    }
  }

  if (!(await cibilCanonicalExistsOnDisk(leadFolderName))) {
    strapi.log.warn(
      `[ApiUploadsMirror] Skipping CIBIL promote/bureau — cibil_report.pdf not on disk for ${leadFolderName}`
    );
    return;
  }

  const { path: canonicalPath, replaced } = await promoteCanonicalCibilReportOnDisk(
    leadId,
    applicantName,
    opts.preferredDiskPath ? { preferredPath: opts.preferredDiskPath } : {}
  );

  if (!canonicalPath) return;

  if (!opts.skipMlSync) {
    await syncCanonicalCibilMediaFile(strapi, leadFolderName, resolvedLoanAppId, {
      preserveFileIds: opts.preserveFileIds,
    });
  }

  if (!(await cibilCanonicalExistsOnDisk(leadFolderName))) {
    strapi.log.warn(
      `[ApiUploadsMirror] Skipping bureau queue — cibil_report.pdf missing after promote for ${leadFolderName}`
    );
    return;
  }

  if (!replaced && (await shouldSkipBureauExtraction(strapi, leadId, applicantName))) {
    strapi.log.debug(
      `[ApiUploadsMirror] Skipping bureau extraction for ${leadFolderName}/${CIBIL_REPORT_FILENAME} — PDF unchanged`
    );
    return;
  }

  strapi.log.info(
    `[ApiUploadsMirror] Queueing bureau extraction for ${leadFolderName}/${CIBIL_REPORT_FILENAME}`
  );

  queueBureauExtraction(strapi, {
    leadId,
    applicantName,
    loanApplicationId: resolvedLoanAppId,
  });
}

export async function maybeQueueBureauAfterLeadSync(
  strapi: Core.Strapi,
  leadId: number | string,
  applicantName: string,
  fieldKey: string | undefined,
  loanApplicationId?: number
): Promise<void> {
  if (fieldKey !== 'cibilReport') return;

  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  await maybeQueueBureauForDiskFile(
    strapi,
    folderName,
    CIBIL_REPORT_FILENAME,
    loanApplicationId
  );
}
