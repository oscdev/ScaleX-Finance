'use strict';

/**
 * The `lenders-page` single type has been renamed to `lenders-catalog-page`
 * to match the Lender Catalog Page display name.
 */

module.exports = {
  async up(knex) {
    const hasOld = await knex.schema.hasTable('lenders_pages');
    const hasNew = await knex.schema.hasTable('lenders_catalog_page');

    if (hasOld && !hasNew) {
      await knex.schema.renameTable('lenders_pages', 'lenders_catalog_page');
    }

    await knex('strapi_core_store_settings')
      .where('key', 'like', '%api::lenders-page.lenders-page%')
      .del();
  },

  async down(knex) {
    const hasOld = await knex.schema.hasTable('lenders_pages');
    const hasNew = await knex.schema.hasTable('lenders_catalog_page');

    if (hasNew && !hasOld) {
      await knex.schema.renameTable('lenders_catalog_page', 'lenders_pages');
    }
  },
};
