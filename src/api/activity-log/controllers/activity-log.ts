import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::activity-log.activity-log', ({ strapi }) => ({
  async createLog(ctx: any) {
    try {
      const { action, description, severity, model, metadata, userId } = ctx.request.body;
      const ipAddress = ctx.request.ip;

      // Use the internal service to handle logic
      const loggerService = strapi.service('api::activity-log.activity-log') as any;

      await loggerService.logEvent({
        action: action || 'client-side-log',
        description: description || 'No description provided',
        severity: severity || 'info',
        model: model || 'frontend',
        metadata: metadata || {},
        ipAddress,
        userId: userId || 'anonymous',
      });

      return ctx.send({ ok: true });
    } catch (err: any) {
      return ctx.badRequest(err.message);
    }
  },
}));
