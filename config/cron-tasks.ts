import { purgeExpiredCodeLogs } from '../src/utils/code-file-logger';

export default {
  // Midnight log cleanup — Activity Logs (DB) + Code-level logs (disk)
  '0 0 * * *': async ({ strapi }) => {
    try {
      const settings = (await strapi.db.query('api::global-setting.global-setting').findOne({})) as any;
      const loggingRetentionDays = settings ? (settings.loggingRetentionDays || 30) : 30;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - loggingRetentionDays);

      const deleted = await strapi.db.query('api::activity-log.activity-log').deleteMany({
        where: {
          createdAt: {
            $lt: cutoffDate,
          },
        },
      });
      const activityDeleted = deleted?.count || 0;

      const codePurge = purgeExpiredCodeLogs(loggingRetentionDays);
      const codeDeleted = codePurge.deleted;

      if (activityDeleted > 0 || codeDeleted > 0) {
        const logger: any = strapi.service('api::activity-log.activity-log');
        await logger.logEvent({
          action: 'LOGS_PURGED',
          description: `Automatically deleted ${activityDeleted} activity log row(s) and ${codeDeleted} code log file(s) older than ${loggingRetentionDays} days.`,
          severity: 'info',
          model: 'system',
          metadata: {
            loggingRetentionDays,
            activityDeleted,
            codeDeleted,
          },
        });
      }
    } catch (err: any) {
      // console.error('[CLEANUP CRON] Failed to clean logs:', err.message);
    }
  },
};
