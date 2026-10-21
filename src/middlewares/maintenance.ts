import type { Core } from '@strapi/strapi';
import { adminPanelPath } from '../utils/resolve-admin-public-url';

/**
 * Maintenance Shield Middleware
 * Rejects public API requests when maintenance mode is active.
 * Admin and Global Setting fetch are always allowed.
 */

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    // 1. Always allow Admin Panel, internal tools, and the Global Setting check
    const panel = adminPanelPath(strapi);
    const url = ctx.url || '';
    const referer = ctx.get('referer') || '';
    const isInternal = url.startsWith('/admin') ||
                       url.startsWith(`${panel}/`) ||
                       url === panel ||
                       url.startsWith('/content-manager') ||
                       url.startsWith('/content-type-builder') ||
                       url.startsWith('/upload') ||
                       url.startsWith('/api/global-setting') ||
                       url.startsWith('/api/activity-logs/log');

    // Safety check: If the request comes from the admin origin/referer, let it through
    const isFromAdmin = referer.includes('/admin') || referer.includes(`${panel}/`);

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
