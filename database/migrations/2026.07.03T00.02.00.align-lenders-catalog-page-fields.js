'use strict';

/**
 * The `lenders-catalog-page` single type's fields are realigned to match
 * `lenders_catalog`'s schema (lenderName, lenderType, lenderCode, isActive),
 * replacing the old title/description page-copy fields.
 */

const LENDER_TYPES = ['Public Bank', 'Private Bank', 'NBFC', 'Fintech / Digital'];

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('lenders_catalog_page');
    if (!hasTable) return;

    const hasLenderName = await knex.schema.hasColumn('lenders_catalog_page', 'lender_name');
    if (hasLenderName) return;

    await knex.schema.alterTable('lenders_catalog_page', (table) => {
      table.string('lender_name');
      table.enu('lender_type', LENDER_TYPES, {
        useNative: true,
        enumName: 'lenders_catalog_page_lender_type_enum',
      });
      table.string('lender_code');
      table.boolean('is_active').notNullable().defaultTo(true);
    });

    await knex.schema.alterTable('lenders_catalog_page', (table) => {
      table.dropColumn('title');
      table.dropColumn('description');
    });
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('lenders_catalog_page');
    if (!hasTable) return;

    const hasLenderName = await knex.schema.hasColumn('lenders_catalog_page', 'lender_name');
    if (!hasLenderName) return;

    await knex.schema.alterTable('lenders_catalog_page', (table) => {
      table.string('title').defaultTo('Matched Lenders');
      table.text('description').defaultTo(
        'Based on your application, these lenders are the best match for your requirements.'
      );
    });

    await knex.schema.alterTable('lenders_catalog_page', (table) => {
      table.dropColumn('lender_name');
      table.dropColumn('lender_type');
      table.dropColumn('lender_code');
      table.dropColumn('is_active');
    });

    await knex.raw('DROP TYPE IF EXISTS lenders_catalog_page_lender_type_enum');
  },
};
