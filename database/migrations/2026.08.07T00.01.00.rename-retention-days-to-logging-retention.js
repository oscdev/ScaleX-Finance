'use strict';

/**
 * Rename global_settings.retention_days → logging_retention_days
 * (API attribute retentionDays → loggingRetentionDays).
 */

module.exports = {
  async up(knex) {
    const hasOld = await knex.schema.hasColumn('global_settings', 'retention_days');
    const hasNew = await knex.schema.hasColumn('global_settings', 'logging_retention_days');

    if (hasOld && !hasNew) {
      await knex.schema.alterTable('global_settings', (table) => {
        table.renameColumn('retention_days', 'logging_retention_days');
      });
    } else if (hasOld && hasNew) {
      await knex.raw(`
        UPDATE global_settings
        SET logging_retention_days = retention_days
        WHERE logging_retention_days IS NULL
      `);
      await knex.schema.alterTable('global_settings', (table) => {
        table.dropColumn('retention_days');
      });
    }
  },

  async down(knex) {
    const hasOld = await knex.schema.hasColumn('global_settings', 'retention_days');
    const hasNew = await knex.schema.hasColumn('global_settings', 'logging_retention_days');

    if (hasNew && !hasOld) {
      await knex.schema.alterTable('global_settings', (table) => {
        table.renameColumn('logging_retention_days', 'retention_days');
      });
    }
  },
};
