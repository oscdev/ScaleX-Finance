import { factories } from '@strapi/strapi';
import { randomUUID } from 'crypto';

async function logBureauExtract(
  strapi: any,
  params: {
    action: string;
    description: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    leadId: number;
    leadName: string;
    correlationId: string;
    loanApplicationId?: number;
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
        loanApplicationId: params.loanApplicationId ?? null,
      },
    });
  } catch {
    // non-fatal
  }
}

export default factories.createCoreController(
  'api::bureau-data-extraction.cibil-report-summary',
  ({ strapi }) => ({
    async extract(ctx: any) {
      const { leadId, leadName, loanApplicationId, dataSource } = ctx.request.body ?? {};

      if (!leadId || !leadName) {
        return ctx.badRequest('leadId and leadName are required');
      }

      const leadIdNum = Number(leadId);
      const name = String(leadName);
      const correlationId = randomUUID();
      const loanAppId =
        loanApplicationId != null ? Number(loanApplicationId) : undefined;

      try {
        await logBureauExtract(strapi, {
          action: 'BUREAU_EXTRACT_STARTED',
          description: `Manual bureau extraction started for lead ${leadIdNum}`,
          leadId: leadIdNum,
          leadName: name,
          correlationId,
          loanApplicationId: loanAppId,
        });

        const service = strapi.service(
          'api::bureau-data-extraction.cibil-report-summary'
        ) as any;

        const result = await service.runExtraction({
          leadId: leadIdNum,
          leadName: name,
          loanApplicationId: loanAppId,
          dataSource: dataSource ?? 'PDF_EXTRACTION',
        });

        await logBureauExtract(strapi, {
          action: 'BUREAU_EXTRACT_COMPLETED',
          description: `Manual bureau extraction completed for lead ${leadIdNum}`,
          leadId: leadIdNum,
          leadName: name,
          correlationId,
          loanApplicationId: loanAppId,
        });

        return ctx.send({ data: result });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error('[CIBIL Extract]', err);
        await logBureauExtract(strapi, {
          action: 'BUREAU_EXTRACT_FAILED',
          description: `Manual bureau extraction failed for lead ${leadIdNum}: ${message}`,
          severity: 'error',
          leadId: leadIdNum,
          leadName: name,
          correlationId,
          loanApplicationId: loanAppId,
        });
        return ctx.internalServerError(message);
      }
    },
  })
);
