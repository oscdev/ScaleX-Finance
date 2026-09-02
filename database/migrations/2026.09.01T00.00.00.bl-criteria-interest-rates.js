'use strict';

/**
 * Add min_interest_rate / max_interest_rate to lenders_criteria_bl and backfill
 * from database/lenders-criteria-bl.sql seed values (percent).
 * Seed VALUES order after max_loan_amount: max_interest_rate, min_interest_rate.
 */

const INTEREST_RATES = [
  ['ZIPLOAN', 24.0, 36.0],
  ['WERIZE', 17.5, 35.0],
  ['MASFIN', 18.0, 26.0],
  ['INCRED', 16.0, 33.0],
  ['FAIRCENT', 24.0, 36.0],
  ['NAVIFIN', 20.0, 36.0],
  ['UGRO', 17.0, 24.0],
  ['AU_SFB', 18.0, 24.0],
  ['IDBI', 12.0, 16.0],
  ['SARASWAT', 14.0, 17.0],
  ['KRAZYBEE', 20.0, 36.0],
  ['ABCAPITAL', 16.0, 24.0],
  ['KREDITBEE', 18.0, 28.0],
  ['PIRAMAL', 15.99, 28.0],
  ['NEOGROWTH', 24.0, 36.0],
  ['SBI', 11.0, 15.0],
  ['FEDERAL', 15.0, 18.0],
  ['CHOLA_HT', 16.0, 18.0],
  ['AXIS', 16.0, 18.0],
  ['HDFC', 19.0, 25.0],
  ['KOTAK', 16.0, 26.0],
  ['INDIFI', 19.0, 35.0],
  ['BAJAJ_FIN', 16.5, 28.0],
  ['FLEXILOANS', 16.5, 28.0],
  ['CHOLA_ST', 16.5, 28.0],
  ['TATA_CAPITAL', 16.5, 28.0],
  ['POONAWALLA', 16.5, 28.0],
  ['LTF', 15.45, 17.25],
  ['PROTIUM', 18.0, 28.0],
  ['LENDINGKART', 17.5, 35.0],
  ['CLIX', 16.5, 21.0],
  ['SHRIRAM', 18.0, 26.0],
  ['INDUSIND', 14.5, 14.5],
  ['HEROFIN', 15.0, 18.0],
  ['SMFG', 15.0, 25.0],
  ['CREDITSAISON', 16.5, 28.0],
  ['BAJAJ_MARKETS', 19.0, 35.0],
  ['YESBANK', 14.0, 18.0],
  ['GODREJ_CAPITAL', 17.0, 18.0],
  ['IDFC_FIRST', 14.0, 17.0],
  ['ICICI', 12.75, 16.25],
  ['KVB', 14.0, 18.0],
  ['SCB', 15.0, 16.0],
  ['HDFC_CGTMSE', 16.0, 18.0],
];

function valuesSql() {
  return INTEREST_RATES.map(
    ([code, minRate, maxRate]) =>
      `('${code}', ${minRate}::numeric(10,2), ${maxRate}::numeric(10,2))`
  ).join(',\n        ');
}

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('lenders_criteria_bl');
    if (!hasTable) return;

    const hasMin = await knex.schema.hasColumn('lenders_criteria_bl', 'min_interest_rate');
    if (!hasMin) {
      await knex.schema.alterTable('lenders_criteria_bl', (table) => {
        table.decimal('min_interest_rate', 10, 2).nullable();
      });
    }

    const hasMax = await knex.schema.hasColumn('lenders_criteria_bl', 'max_interest_rate');
    if (!hasMax) {
      await knex.schema.alterTable('lenders_criteria_bl', (table) => {
        table.decimal('max_interest_rate', 10, 2).nullable();
      });
    }

    await knex.raw(`
      UPDATE lenders_criteria_bl AS t
      SET
        min_interest_rate = v.min_interest_rate,
        max_interest_rate = v.max_interest_rate
      FROM (
        VALUES
        ${valuesSql()}
      ) AS v(lender_code, min_interest_rate, max_interest_rate)
      WHERE t.lender_code = v.lender_code
    `);
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('lenders_criteria_bl');
    if (!hasTable) return;

    const hasMin = await knex.schema.hasColumn('lenders_criteria_bl', 'min_interest_rate');
    if (hasMin) {
      await knex.schema.alterTable('lenders_criteria_bl', (table) => {
        table.dropColumn('min_interest_rate');
      });
    }

    const hasMax = await knex.schema.hasColumn('lenders_criteria_bl', 'max_interest_rate');
    if (hasMax) {
      await knex.schema.alterTable('lenders_criteria_bl', (table) => {
        table.dropColumn('max_interest_rate');
      });
    }
  },
};
