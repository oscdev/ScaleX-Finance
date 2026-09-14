'use strict';

/**
 * Add loan_type to zip_codes_to_lenders, expand existing rows to all products,
 * then enforce NOT NULL + unique indexes for PINCODE matching.
 */

const LOAN_TYPES = ['PL', 'BL', 'HL', 'LAP'];

function newDocumentId() {
  // Strapi document_id is a string; use crypto when available.
  try {
    // eslint-disable-next-line global-require
    const { randomUUID } = require('node:crypto');
    return randomUUID().replace(/-/g, '');
  } catch {
    return `zip${Date.now()}${Math.floor(Math.random() * 1e9)}`;
  }
}

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('zip_codes_to_lenders');
    if (!hasTable) return;

    const hasLoanType = await knex.schema.hasColumn('zip_codes_to_lenders', 'loan_type');
    if (!hasLoanType) {
      await knex.schema.alterTable('zip_codes_to_lenders', (table) => {
        table.string('loan_type').nullable();
      });
    }

    const legacy = await knex('zip_codes_to_lenders').whereNull('loan_type').select('*');
    const now = knex.fn.now();

    for (const row of legacy) {
      const inserts = LOAN_TYPES.map((loanType) => ({
        document_id: newDocumentId(),
        lender_code: row.lender_code,
        zip_code: row.zip_code,
        covers_all_pincodes: row.covers_all_pincodes,
        is_active: row.is_active,
        loan_type: loanType,
        created_at: row.created_at || now,
        updated_at: now,
        published_at: row.published_at || null,
        created_by_id: row.created_by_id || null,
        updated_by_id: row.updated_by_id || null,
        locale: row.locale || null,
      }));
      if (inserts.length) {
        await knex('zip_codes_to_lenders').insert(inserts);
      }
      await knex('zip_codes_to_lenders').where({ id: row.id }).del();
    }

    // Any remaining nulls (edge cases) get Personal Loan so NOT NULL can apply.
    await knex('zip_codes_to_lenders').whereNull('loan_type').update({ loan_type: 'PL' });

    await knex.schema.alterTable('zip_codes_to_lenders', (table) => {
      table.string('loan_type').notNullable().alter();
    });

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
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('zip_codes_to_lenders');
    if (!hasTable) return;

    await knex.raw(`DROP INDEX IF EXISTS zip_codes_lender_zip_loan_type_uidx`);
    await knex.raw(`DROP INDEX IF EXISTS zip_codes_lender_covers_all_loan_type_uidx`);

    const hasLoanType = await knex.schema.hasColumn('zip_codes_to_lenders', 'loan_type');
    if (hasLoanType) {
      // Collapse to one row per lender+zip (keep Personal Loan when present).
      const keep = await knex('zip_codes_to_lenders')
        .where({ loan_type: 'PL' })
        .select('id');
      const keepIds = new Set(keep.map((r) => r.id));
      const all = await knex('zip_codes_to_lenders').select('id', 'lender_code', 'zip_code', 'loan_type');
      const seen = new Set();
      for (const row of all) {
        const key = `${row.lender_code}|${row.zip_code ?? 'null'}`;
        if (keepIds.has(row.id)) {
          seen.add(key);
          continue;
        }
        if (seen.has(key)) {
          await knex('zip_codes_to_lenders').where({ id: row.id }).del();
        } else {
          seen.add(key);
        }
      }
      await knex.schema.alterTable('zip_codes_to_lenders', (table) => {
        table.dropColumn('loan_type');
      });
    }
  },
};
