'use strict';

/**
 * BL scoring: activity_log BL_SCORE_* enum values.
 */

async function addActivityLogEnums(knex) {
  try {
    const rows = await knex.raw(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE '%activity_logs_action%'
      LIMIT 1
    `);
    const typname = rows?.rows?.[0]?.typname;
    if (!typname) return;

    const values = [
      'BL_SCORE_RUN_START',
      'BL_SCORE_CRITERION',
      'BL_SCORE_CRITERION_SKIP',
      'BL_SCORE_CRITERION_INACTIVE',
      'BL_SCORE_LENDER',
      'BL_SCORE_RANK_COMPLETE',
      'BL_SCORE_RUN_DONE',
      'BL_SCORE_BLOCKED',
    ];
    for (const v of values) {
      try {
        await knex.raw(`ALTER TYPE "${typname}" ADD VALUE IF NOT EXISTS '${v}'`);
      } catch {
        // ignore
      }
    }
  } catch {
    // non-Postgres or enum not present
  }
}

module.exports = {
  async up(knex) {
    await addActivityLogEnums(knex);
  },

  async down() {
    // enum values retained on rollback
  },
};
