import { factories } from '@strapi/strapi';
import { safeUnexpectedMessage } from '../../../utils/safe-http-error';

export default factories.createCoreController(
  'api::system-events.activity-log',
  ({ strapi }) => ({
    async createLog(ctx: any) {
      try {
        const {
          action,
          description,
          severity,
          model,
          metadata,
          userId,
          leadId,
          leadName,
          category,
          correlationId,
        } = ctx.request.body;
        const ipAddress = ctx.request.ip;

        const loggerService = strapi.service(
          'api::system-events.activity-log'
        ) as any;

        await loggerService.logEvent({
          action: action || 'client-side-log',
          description: description || 'No description provided',
          severity: severity || 'info',
          model: model || 'frontend',
          metadata: metadata || {},
          ipAddress,
          userId: userId || 'anonymous',
          leadId,
          leadName,
          category,
          correlationId,
        });

        return ctx.send({ ok: true });
      } catch (err: any) {
        strapi.log.error('[activity-log] createLog failed', err);
        return ctx.badRequest(safeUnexpectedMessage());
      }
    },

    async byLead(ctx: any) {
      try {
        const service = strapi.service(
          'api::system-events.activity-log'
        ) as any;
        const result = await service.listByLead({
          search: ctx.query.search,
          page: ctx.query.page,
          pageSize: ctx.query.pageSize,
        });
        ctx.body = result;
      } catch (err: any) {
        strapi.log.error('[activity-log] byLead failed', err);
        ctx.status = 500;
        ctx.body = { error: { message: safeUnexpectedMessage() } };
      }
    },

    async forLead(ctx: any) {
      try {
        const leadId = Number(ctx.params.leadId);
        if (!Number.isFinite(leadId) || leadId <= 0) {
          ctx.status = 400;
          ctx.body = { error: { message: 'leadId is required' } };
          return;
        }
        const service = strapi.service(
          'api::system-events.activity-log'
        ) as any;
        const result = await service.listForLead(leadId, {
          category: ctx.query.category,
          page: ctx.query.page,
          pageSize: ctx.query.pageSize,
        });
        ctx.body = result;
      } catch (err: any) {
        strapi.log.error('[activity-log] forLead failed', err);
        ctx.status = 500;
        ctx.body = { error: { message: safeUnexpectedMessage() } };
      }
    },
  })
);
