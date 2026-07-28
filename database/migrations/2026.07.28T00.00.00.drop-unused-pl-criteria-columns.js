'use strict';

/**
 * Drop unused PL eligibility criteria columns:
 * max_dpd_count_6months, max_new_personal_loans_6months, typical_interest_rate
 */

const COLUMNS = [
  'max_dpd_count_6months',
  'max_new_personal_loans_6months',
  'typical_interest_rate',
];

module.exports = {
  async up(knex) {
    const hasCriteria = await knex.schema.hasTable('lenders_criteria_pl');
    if (!hasCriteria) return;

    for (const col of COLUMNS) {
      const exists = await knex.schema.hasColumn('lenders_criteria_pl', col);
      if (exists) {
        await knex.schema.alterTable('lenders_criteria_pl', (t) => {
          t.dropColumn(col);
        });
      }
    }
  },

  async down(knex) {
    const hasCriteria = await knex.schema.hasTable('lenders_criteria_pl');
    if (!hasCriteria) return;

    const hasDpd6 = await knex.schema.hasColumn('lenders_criteria_pl', 'max_dpd_count_6months');
    if (!hasDpd6) {
      await knex.schema.alterTable('lenders_criteria_pl', (t) => {
        t.integer('max_dpd_count_6months');
      });
    }

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
  },
};
