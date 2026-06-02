'use strict';

/**
 * Renames advisor_remark → advisor_admin_staff_remark and adds banker_admin_staff_remark
 * in the lead_remark table.
 */

module.exports = {
  async up(knex) {
    const hasOld = await knex.schema.hasColumn('lead_remark', 'advisor_remark');
    const hasNew = await knex.schema.hasColumn('lead_remark', 'advisor_admin_staff_remark');
    const hasBanker = await knex.schema.hasColumn('lead_remark', 'banker_admin_staff_remark');

    await knex.schema.alterTable('lead_remark', (table) => {
      if (hasOld && !hasNew) table.renameColumn('advisor_remark', 'advisor_admin_staff_remark');
      if (!hasBanker) table.jsonb('banker_admin_staff_remark').nullable();
    });
  },

  async down(knex) {
    const hasNew = await knex.schema.hasColumn('lead_remark', 'advisor_admin_staff_remark');
    const hasOld = await knex.schema.hasColumn('lead_remark', 'advisor_remark');
    const hasBanker = await knex.schema.hasColumn('lead_remark', 'banker_admin_staff_remark');

    await knex.schema.alterTable('lead_remark', (table) => {
      if (hasNew && !hasOld) table.renameColumn('advisor_admin_staff_remark', 'advisor_remark');
      if (hasBanker) table.dropColumn('banker_admin_staff_remark');
    });
  },
};
