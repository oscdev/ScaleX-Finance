import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
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
    if (!logger?.logEvent) return;
    await logger.logEvent({
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
    const correlationId = randomUUID();

    try {
      const hasCibil = await cibilReportExists(params.leadId, params.applicantName);
      if (!hasCibil) {
        strapi.log.warn(
          `[Bureau Auto] Skipping — ${cibilRelPath} not found in api_uploads`
        );
        return;
      }

      strapi.log.info(`[Bureau Auto] START extraction for ${cibilRelPath}`);
      await logBureau(strapi, {
        action: 'BUREAU_EXTRACT_STARTED',
        description: `Bureau extraction started for ${cibilRelPath}`,
        leadId: leadIdNum,
        leadName: params.applicantName,
        correlationId,
        metadata: {
          loanApplicationId: params.loanApplicationId ?? null,
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
  });
}
