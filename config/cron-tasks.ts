export default {
  // Midnight log cleanup job
  '0 0 * * *': async ({ strapi }) => {
    try {
      // 1. Fetch Global Settings to get retentionDays
      const settings = (await strapi.db.query('api::global-setting.global-setting').findOne({})) as any;
      const retentionDays = settings ? (settings.retentionDays || 30) : 30;

      // 2. Calculate the "Cutoff Date"
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // 3. Delete logs older than the cutoff
      const deleted = await strapi.db.query('api::activity-log.activity-log').deleteMany({
        where: {
          createdAt: {
            $lt: cutoffDate,
          },
        },
      });

      if (deleted && deleted.count > 0) {
        // We Use the internal logger to record that we CLEANED UP (silent audit)
        const logger: any = strapi.service('api::activity-log.activity-log');
        await logger.logEvent({
          action: 'LOG_CLEANUP_CRON',
          description: `Automatically deleted ${deleted.count} logs older than ${retentionDays} days.`,
          severity: 'info',
          model: 'system',
        });
      }
    } catch (err: any) {
      // console.error('[CLEANUP CRON] Failed to clean logs:', err.message);
    }
  },
};
