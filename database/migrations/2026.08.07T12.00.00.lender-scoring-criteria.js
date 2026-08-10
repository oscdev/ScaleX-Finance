'use strict';

/**
 * PL scoring: activity_log PL_SCORE_* enum values.
 * Criterion seed data: database/seed-data/lender-scoring-criteria.sql
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
      'PL_SCORE_RUN_START',
      'PL_SCORE_CRITERION',
      'PL_SCORE_CRITERION_SKIP',
      'PL_SCORE_CRITERION_INACTIVE',
      'PL_SCORE_LENDER',
      'PL_SCORE_RANK_COMPLETE',
      'PL_SCORE_RUN_DONE',
      'PL_SCORE_BLOCKED',
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
