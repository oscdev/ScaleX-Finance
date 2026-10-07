'use strict';

/**
 * Rewrite user_product_mappings.product full loan names to PL | BL | HL | LAP.
 * Rows already stored as those codes, and any other product title, are left as-is.
 * Same label list as 2026.09.14T12.00.00.loan-type-codes.js, this table only.
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
  { from: ['pl', 'Pl', 'pL'], to: 'PL' },
  { from: ['bl', 'Bl', 'bL'], to: 'BL' },
  { from: ['hl', 'Hl', 'hL'], to: 'HL' },
  { from: ['lap', 'Lap', 'lAp', 'laP', 'LAp', 'lAP', 'LaP'], to: 'LAP' },
];

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('user_product_mappings');
    if (!hasTable) return;
    const hasCol = await knex.schema.hasColumn('user_product_mappings', 'product');
    if (!hasCol) return;

    for (const { from, to } of CODE_MAP) {
      await knex('user_product_mappings').whereIn('product', from).update({ product: to });
    }
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('user_product_mappings');
    if (!hasTable) return;
    const hasCol = await knex.schema.hasColumn('user_product_mappings', 'product');
    if (!hasCol) return;

    const reverse = [
      { code: 'PL', label: 'Personal Loan' },
      { code: 'BL', label: 'Business Loan' },
      { code: 'HL', label: 'Home Loan' },
      { code: 'LAP', label: 'Loan Against Property' },
    ];
    for (const { code, label } of reverse) {
      await knex('user_product_mappings').where('product', code).update({ product: label });
    }
  },
};
