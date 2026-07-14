'use strict';

/**
 * Drops tables for removed Strapi modules:
 * - advanced-lenders-criteria-pl (advanced_lenders_criteria_pl)
 * - hdfc-bank-page single type (hdfc-bank-pages)
 * - axis-bank-page single type (axis-bank-pages)
 */

const REMOVED = [
  {
    table: 'advanced_lenders_criteria_pl',
    uid: 'api::advanced-lenders-criteria-pl.advanced-lenders-criteria-pl',
    enums: ['advanced_lenders_criteria_pl_period_months_enum'],
  },
  {
    table: 'hdfc-bank-pages',
    uid: 'api::hdfc-bank-page.hdfc-bank-page',
    enums: [],
  },
  {
    table: 'axis-bank-pages',
    uid: 'api::axis-bank-page.axis-bank-page',
    enums: [],
  },
];

async function dropRemovedModule(knex, { table, uid, enums }) {
  const hasTable = await knex.schema.hasTable(table);
  if (!hasTable) return;

  const hasMorph = await knex.schema.hasTable('files_related_mph');
  if (hasMorph) {
    await knex('files_related_mph').where({ related_type: uid }).del();
  }

  await knex('strapi_core_store_settings')
    .where('key', 'like', `%${uid}%`)
    .del();

  await knex.schema.dropTable(table);

  for (const enumName of enums) {
    await knex.raw(`DROP TYPE IF EXISTS "${enumName}"`);
  }
}

module.exports = {
  async up(knex) {
    for (const entry of REMOVED) {
      await dropRemovedModule(knex, entry);
    }
  },

  async down() {
    // Irreversible — removed modules are not restored.
  },
};
