import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::activity-log.activity-log' as any, ({ strapi }) => ({
  async logEvent(params: {
    action: string;
    description?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    model?: string;
    metadata?: any;
    ipAddress?: string;
    userId?: string;
  }) {
    try {
      // 1. Check Global Settings logic
      const settings = (await strapi.db.query('api::global-setting.global-setting').findOne({})) as any;
      const isLoggingEnabled = settings ? settings.loggingIsEnabled : true;

      // 2. Only log if enabled (or if it's an error/critical)
      if (isLoggingEnabled || params.severity === 'critical' || params.severity === 'error') {
        const { action, description, severity, model, metadata, ipAddress, userId } = params;

        await strapi.db.query('api::activity-log.activity-log').create({
          data: {
            action,
            description,
            severity: severity || 'info',
            model,
            metadata: metadata || {},
            ipAddress,
            userId,
            publishedAt: new Date(),
          },
        });
        
        // Optionally also log to console in non-production environments
        if (process.env.NODE_ENV === 'development') {
           // console.log(`[Activity Log] ${action}: ${description}`);
        }
      }
    } catch (err: any) {
       // console.error('[Logger Service] Failed to write log:', err.message);
    }
  },
}));
