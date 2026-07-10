import fs from 'fs/promises';
import path from 'path';
import type { Core } from '@strapi/strapi';
import {
  buildLeadUploadFolderName,
  getLeadUploadDiskDir,
} from '../utils/lead-upload-folder';

export const CIBIL_REPORT_FILENAME = 'cibil_report.pdf';

export type BureauExtractionParams = {
  leadId: number | string;
  applicantName: string;
  loanApplicationId?: number;
};

export function buildCibilReportRelPath(
  leadId: number | string,
  applicantName: string
): string {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  return `${folderName}/${CIBIL_REPORT_FILENAME}`;
}

export async function cibilReportExists(
  leadId: number | string,
  applicantName: string
): Promise<boolean> {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  const cibilPath = path.join(getLeadUploadDiskDir(folderName), CIBIL_REPORT_FILENAME);
  try {
    await fs.access(cibilPath);
    return true;
  } catch {
    return false;
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

  setImmediate(async () => {
    const cibilRelPath = buildCibilReportRelPath(params.leadId, params.applicantName);

    try {
      const hasCibil = await cibilReportExists(params.leadId, params.applicantName);
      if (!hasCibil) {
        strapi.log.warn(
          `[Bureau Auto] Skipping — ${cibilRelPath} not found in api_uploads`
        );
        return;
      }

      strapi.log.info(`[Bureau Auto] START extraction for ${cibilRelPath}`);

      const service = strapi.service(
        'api::bureau-data-extraction.cibil-report-summary'
      ) as {
        runExtraction: (args: {
          leadId: number;
          leadName: string;
          loanApplicationId?: number;
          dataSource: string;
        }) => Promise<unknown>;
      };

      await service.runExtraction({
        leadId: leadIdNum,
        leadName: params.applicantName,
        loanApplicationId: params.loanApplicationId,
        dataSource: 'PDF_EXTRACTION',
      });

      strapi.log.info(`[Bureau Auto] END extraction for ${cibilRelPath}`);
    } catch (err) {
      strapi.log.error(`[Bureau Auto] FAILED extraction for ${cibilRelPath}:`, err);
    }
  });
}
