'use strict';

/**
 * Canonicalize loan_type / product fields to PL | BL | HL | LAP.
 * Maps legacy full labels (Personal Loan, Business Loan, …) and LAP Loan.
 */

const CODE_MAP = [
  { from: ['Personal Loan', 'personal loan', 'PERSONAL LOAN'], to: 'PL' },
  { from: ['Business Loan', 'business loan', 'BUSINESS LOAN'], to: 'BL' },
  { from: ['Home Loan', 'home loan', 'HOME LOAN'], to: 'HL' },
  {
    from: [
      'LAP Loan',
      'lap loan',
      'LAP LOAN',
      'Loan Against Property',
      'loan against property',
      'LOAN AGAINST PROPERTY',
      'LAP (Loan Against Property)',
    ],
    to: 'LAP',
  },
  // Already-canonical short forms (normalize case)
  { from: ['pl', 'Pl', 'pL'], to: 'PL' },
  { from: ['bl', 'Bl', 'bL'], to: 'BL' },
  { from: ['hl', 'Hl', 'hL'], to: 'HL' },
  { from: ['lap', 'Lap', 'lAp', 'laP', 'LAp', 'lAP', 'LaP'], to: 'LAP' },
];

async function remapColumn(knex, table, column) {
  const hasTable = await knex.schema.hasTable(table);
  if (!hasTable) return;
  const hasCol = await knex.schema.hasColumn(table, column);
  if (!hasCol) return;

  for (const { from, to } of CODE_MAP) {
    await knex(table).whereIn(column, from).update({ [column]: to });
  }
}

module.exports = {
  async up(knex) {
    await remapColumn(knex, 'loan_applications', 'loan_type');
    await remapColumn(knex, 'zip_codes_to_lenders', 'loan_type');
    await remapColumn(knex, 'lender_scoring_criteria', 'loan_type');
    await remapColumn(knex, 'leads', 'selected_product');
    await remapColumn(knex, 'user_product_mappings', 'product');

    // Ensure zip unique indexes still exist after value rewrite
    const hasZip = await knex.schema.hasTable('zip_codes_to_lenders');
    if (hasZip) {
      await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS zip_codes_lender_zip_loan_type_uidx
        ON zip_codes_to_lenders (lender_code, zip_code, loan_type)
        WHERE zip_code IS NOT NULL
      `);
      await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS zip_codes_lender_covers_all_loan_type_uidx
        ON zip_codes_to_lenders (lender_code, loan_type)
        WHERE covers_all_pincodes = true AND zip_code IS NULL
      `);
    }
  },

  async down(knex) {
    // Reverse codes → full labels (best-effort; LAP → Loan Against Property)
    const reverse = [
      { code: 'PL', label: 'Personal Loan' },
      { code: 'BL', label: 'Business Loan' },
      { code: 'HL', label: 'Home Loan' },
      { code: 'LAP', label: 'LAP' },
    ];

    async function reverseColumn(table, column) {
      const hasTable = await knex.schema.hasTable(table);
      if (!hasTable) return;
      const hasCol = await knex.schema.hasColumn(table, column);
      if (!hasCol) return;
      for (const { code, label } of reverse) {
        await knex(table).where(column, code).update({ [column]: label });
      }
    }

    await reverseColumn(knex, 'loan_applications', 'loan_type');
    await reverseColumn(knex, 'zip_codes_to_lenders', 'loan_type');
    // Scoring historically used "LAP Loan" and full Personal/Business labels
    const hasScoring = await knex.schema.hasTable('lender_scoring_criteria');
    if (hasScoring && (await knex.schema.hasColumn('lender_scoring_criteria', 'loan_type'))) {
      await knex('lender_scoring_criteria').where('loan_type', 'PL').update({ loan_type: 'Personal Loan' });
      await knex('lender_scoring_criteria').where('loan_type', 'BL').update({ loan_type: 'Business Loan' });
      await knex('lender_scoring_criteria').where('loan_type', 'HL').update({ loan_type: 'Home Loan' });
      await knex('lender_scoring_criteria').where('loan_type', 'LAP').update({ loan_type: 'LAP Loan' });
    }
    await reverseColumn(knex, 'leads', 'selected_product');
    await reverseColumn(knex, 'user_product_mappings', 'product');
  },
};
