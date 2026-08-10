'use strict';

/**
 * Rename global_settings.logging_is_enabled → activity_logging_is_enabled
 * (API attribute loggingIsEnabled → activityLoggingIsEnabled).
 */

module.exports = {
  async up(knex) {
    const hasOld = await knex.schema.hasColumn('global_settings', 'logging_is_enabled');
    const hasNew = await knex.schema.hasColumn('global_settings', 'activity_logging_is_enabled');

    if (hasOld && !hasNew) {
      await knex.schema.alterTable('global_settings', (table) => {
        table.renameColumn('logging_is_enabled', 'activity_logging_is_enabled');
      });
    } else if (hasOld && hasNew) {
      // Column already recreated by Strapi schema sync; copy values then drop old.
      await knex.raw(`
        UPDATE global_settings
        SET activity_logging_is_enabled = logging_is_enabled
        WHERE activity_logging_is_enabled IS NULL
      `);
      await knex.schema.alterTable('global_settings', (table) => {
        table.dropColumn('logging_is_enabled');
      });
    }
  },

  async down(knex) {
    const hasOld = await knex.schema.hasColumn('global_settings', 'logging_is_enabled');
    const hasNew = await knex.schema.hasColumn('global_settings', 'activity_logging_is_enabled');

    if (hasNew && !hasOld) {
      await knex.schema.alterTable('global_settings', (table) => {
        table.renameColumn('activity_logging_is_enabled', 'logging_is_enabled');
      });
    }
  },
};
