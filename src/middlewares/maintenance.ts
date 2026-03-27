import type { Core } from '@strapi/strapi';

/**
 * Maintenance Shield Middleware
 * Rejects public API requests when maintenance mode is active.
 * Admin and Global Setting fetch are always allowed.
 */

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    // 1. Always allow Admin Panel, internal tools, and the Global Setting check
    const isInternal = ctx.url.startsWith('/admin') || 
                       ctx.url.startsWith('/content-manager') ||
                       ctx.url.startsWith('/content-type-builder') ||
                       ctx.url.startsWith('/upload') ||
                       ctx.url.startsWith('/api/global-setting') ||
                       ctx.url.startsWith('/api/activity-logs/log');
    
    // Safety check: If the request comes from the admin origin/referer, let it through
    const isFromAdmin = ctx.get('referer')?.includes('/admin');

    if (isInternal || isFromAdmin) {
      return next();
    }

    try {
      // 2. Fetch the Global Setting status
      const globalSetting = await strapi.db.query('api::global-setting.global-setting').findOne({});
      
      const maintenanceActive = globalSetting?.maintenanceModeIsEnabled ?? false;

      // 3. If active, block the request with a professional message
      if (maintenanceActive) {
        return ctx.send({
          error: {
            status: 503,
            name: 'ServiceUnavailableError',
            message: 'ScaleX Finance is currently under scheduled maintenance. Please try again soon!',
            details: { maintenanceMode: true }
          }
        }, 503);
      }
    } catch (err) {
      // Fallback if DB fetch fails: Allow the request to proceed to avoid total lockouts
      // console.error('[Maintenance Middleware] Error checking status:', err);
    }

    return next();
  };
};
