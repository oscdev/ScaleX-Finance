import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::bureau-data-extraction.cibil-report-summary',
  ({ strapi }) => ({
    async extract(ctx: any) {
      const { leadId, leadName, loanApplicationId, dataSource } = ctx.request.body ?? {};

      if (!leadId || !leadName) {
        return ctx.badRequest('leadId and leadName are required');
      }

      try {
        const service = strapi.service(
          'api::bureau-data-extraction.cibil-report-summary'
        ) as any;

        const result = await service.runExtraction({
          leadId: Number(leadId),
          leadName: String(leadName),
          loanApplicationId:
            loanApplicationId != null ? Number(loanApplicationId) : undefined,
          dataSource: dataSource ?? 'PDF_EXTRACTION',
        });

        return ctx.send({ data: result });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error('[CIBIL Extract]', err);
        return ctx.internalServerError(message);
      }
    },
  })
);
