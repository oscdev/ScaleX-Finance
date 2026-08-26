'use strict';

/**
 * Widen BL criteria money columns so seed ₹ amounts (up to ~15 Cr) fit.
 * Strapi default decimal is numeric(10,2) which overflows at >= 1e8.
 */

const COLUMNS = [
  'min_annual_turnover',
  'min_loan_amount',
  'max_loan_amount',
];

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('lenders_criteria_bl');
    if (!hasTable) return;

    for (const col of COLUMNS) {
      const hasCol = await knex.schema.hasColumn('lenders_criteria_bl', col);
      if (!hasCol) continue;
      await knex.raw(
        `ALTER TABLE lenders_criteria_bl ALTER COLUMN "${col}" TYPE numeric(14, 2) USING "${col}"::numeric(14, 2)`
      );
    }
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('lenders_criteria_bl');
    if (!hasTable) return;

    for (const col of COLUMNS) {
      const hasCol = await knex.schema.hasColumn('lenders_criteria_bl', col);
      if (!hasCol) continue;
      // May fail if values exceed numeric(10,2); intentional for rollback awareness
      await knex.raw(
        `ALTER TABLE lenders_criteria_bl ALTER COLUMN "${col}" TYPE numeric(10, 2) USING "${col}"::numeric(10, 2)`
      );
    }
  },
};
