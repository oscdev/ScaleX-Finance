'use strict';

/**
 * BL eligibility: add BL_ELIGIBILITY_* activity_log action enum values.
 */

module.exports = {
  async up(knex) {
    try {
      const rows = await knex.raw(`
        SELECT t.typname
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname LIKE '%activity_logs_action%'
        LIMIT 1
      `);
      const typname = rows?.rows?.[0]?.typname;
      if (typname) {
        const values = [
          'BL_ELIGIBILITY_RUN_START',
          'BL_ELIGIBILITY_BLOCKED',
          'BL_ELIGIBILITY_RULE',
          'BL_ELIGIBILITY_RULE_SKIP',
          'BL_ELIGIBILITY_LENDER',
          'BL_ELIGIBILITY_RUN_COMPLETE',
          'BL_ELIGIBILITY_CONNECTION_FAILED',
        ];
        for (const v of values) {
          try {
            await knex.raw(`ALTER TYPE "${typname}" ADD VALUE IF NOT EXISTS '${v}'`);
          } catch {
            // Ignore if already present or dialect unsupported
          }
        }
      }
    } catch {
      // Non-Postgres or enum not present — Strapi schema sync handles string enums
    }
  },

  async down() {
    // Enum values are not removed (Postgres limitation / safe no-op)
  },
};
