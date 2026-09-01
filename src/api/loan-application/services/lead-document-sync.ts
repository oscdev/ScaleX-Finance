import type { Core } from '@strapi/strapi';
import { buildLeadUploadFolderName } from '../utils/lead-upload-folder';
import {
  linkFilesToLeadUploadFolder,
  mirrorLeadDocumentsToDisk,
} from './api-uploads-mirror';

export type SyncLeadDocumentsOptions = {
  loanApplicationId?: number;
};

/** Normalize Strapi v5 media relation payloads to upload file id. */
export function resolveMediaFileId(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return parsed > 0 ? parsed : null;
  }
  if (typeof value !== 'object') return null;

  const o = value as Record<string, unknown>;
  if (o.id != null) {
    return resolveMediaFileId(o.id);
  }

  const connect = o.connect;
  if (Array.isArray(connect) && connect.length > 0) {
    return resolveMediaFileId(connect[connect.length - 1]);
  }

  const set = o.set;
  if (Array.isArray(set) && set.length > 0) {
    return resolveMediaFileId(set[set.length - 1]);
  }

  return null;
}

export { linkFilesToLeadUploadFolder };

export type SyncCibilReportParams = {
  loanApplicationId?: number;
  leadId: number | string;
  applicantName: string;
  cibilFileId: number;
};

/**
 * Sync CIBIL PDF to api_uploads and queue bureau extraction.
 * Used by loan-application lifecycles (admin) and public form afterCreate.
 */
export async function syncCibilReportForLoanApplication(
  strapi: Core.Strapi,
  params: SyncCibilReportParams
) {
  const leadId = params.leadId;
  const applicantName = String(params.applicantName ?? '').trim();
  const cibilFileId = params.cibilFileId;

  if (leadId == null || String(leadId).trim() === '') {
    strapi.log.warn('[LeadDocSync] Skipping CIBIL sync — missing leadId');
    return null;
  }
  if (!applicantName) {
    strapi.log.warn('[LeadDocSync] Skipping CIBIL sync — missing applicantName');
    return null;
  }
  if (!cibilFileId) {
    return null;
  }

  await linkFilesToLeadUploadFolder(strapi, leadId, applicantName, [cibilFileId]);

  return syncLeadDocumentsToDisk(
    strapi,
    leadId,
    applicantName,
    [cibilFileId],
    { [cibilFileId]: 'cibilReport' },
    { loanApplicationId: params.loanApplicationId }
  );
}

export async function syncLeadDocumentsToDisk(
  strapi: Core.Strapi,
  leadId: number | string,
  applicantName: string,
  fileIds: Iterable<number>,
  fileFieldById: Record<number, string> = {},
  options: SyncLeadDocumentsOptions = {}
) {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  const ids = [...fileIds];

  await linkFilesToLeadUploadFolder(strapi, leadId, applicantName, ids);

  const { targetDir, results } = await mirrorLeadDocumentsToDisk(
    strapi,
    folderName,
    ids,
    fileFieldById,
    { loanApplicationId: options.loanApplicationId }
  );

  strapi.log.info(
    `[LeadDocSync] Moved ${results.filter((r) => r.ok).length}/${results.length} file(s) to public/uploads/api_uploads/${folderName}/`
  );

  return { folderName, targetDir, results };
}
