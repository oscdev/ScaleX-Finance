'use strict';

/**
 * PL eligibility: add criteria columns + activity_log action enum values.
 */

module.exports = {
  async up(knex) {
    const hasCriteria = await knex.schema.hasTable('lenders_criteria_pl');
    if (hasCriteria) {
      const hasNewPl = await knex.schema.hasColumn(
        'lenders_criteria_pl',
        'max_new_personal_loans_6months'
      );
      if (!hasNewPl) {
        await knex.schema.alterTable('lenders_criteria_pl', (t) => {
          t.integer('max_new_personal_loans_6months');
        });
      }
      const hasTypical = await knex.schema.hasColumn(
        'lenders_criteria_pl',
        'typical_interest_rate'
      );
      if (!hasTypical) {
        await knex.schema.alterTable('lenders_criteria_pl', (t) => {
          t.decimal('typical_interest_rate', 10, 4);
        });
      }
    }

    // PostgreSQL: Strapi stores enums as check constraints or native enums depending on version.
    // Prefer ALTER TYPE if the enum type exists; otherwise no-op (schema.json drives reloads).
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
          'PL_ELIGIBILITY_RUN_START',
          'PL_ELIGIBILITY_BLOCKED',
          'PL_ELIGIBILITY_RULE',
          'PL_ELIGIBILITY_RULE_SKIP',
          'PL_ELIGIBILITY_LENDER',
          'PL_ELIGIBILITY_RUN_COMPLETE',
          'PL_ELIGIBILITY_CONNECTION_FAILED',
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

  async down(knex) {
    const hasCriteria = await knex.schema.hasTable('lenders_criteria_pl');
    if (!hasCriteria) return;
    const hasNewPl = await knex.schema.hasColumn(
      'lenders_criteria_pl',
      'max_new_personal_loans_6months'
    );
    if (hasNewPl) {
      await knex.schema.alterTable('lenders_criteria_pl', (t) => {
        t.dropColumn('max_new_personal_loans_6months');
      });
    }
    const hasTypical = await knex.schema.hasColumn(
      'lenders_criteria_pl',
      'typical_interest_rate'
    );
    if (hasTypical) {
      await knex.schema.alterTable('lenders_criteria_pl', (t) => {
        t.dropColumn('typical_interest_rate');
      });
    }
  },
};
