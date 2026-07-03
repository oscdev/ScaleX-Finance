'use strict';

/**
 * The `lenders-catalog-page` single type has been removed entirely.
 * Drops the `lenders_catalog_page` table.
 */

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('lenders_catalog_page');
    if (!hasTable) return;

    const hasMorph = await knex.schema.hasTable('files_related_mph');
    if (hasMorph) {
      await knex('files_related_mph').where({ related_type: 'api::lenders-catalog-page.lenders-catalog-page' }).del();
    }

    await knex('strapi_core_store_settings')
      .where('key', 'like', '%api::lenders-catalog-page.lenders-catalog-page%')
      .del();

    await knex.schema.dropTable('lenders_catalog_page');
    await knex.raw('DROP TYPE IF EXISTS lenders_catalog_page_lender_type_enum');
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('lenders_catalog_page');
    if (hasTable) return;

    await knex.schema.createTable('lenders_catalog_page', (table) => {
      table.increments('id');
      table.string('document_id').notNullable();
      table.string('lender_name');
      table.enu('lender_type', ['Public Bank', 'Private Bank', 'NBFC', 'Fintech / Digital'], {
        useNative: true,
        enumName: 'lenders_catalog_page_lender_type_enum',
      });
      table.string('lender_code');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.datetime('created_at');
      table.datetime('updated_at');
      table.datetime('published_at');
      table.integer('created_by_id');
      table.integer('updated_by_id');
      table.integer('locale');
    });
  },
};
