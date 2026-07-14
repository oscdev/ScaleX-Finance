'use strict';

/**
 * Drops table for removed Strapi module:
 * - lender-business-exclusion (lender_business_exclusions)
 */

module.exports = {
  async up(knex) {
    const table = 'lender_business_exclusions';
    const uid = 'api::lender-business-exclusion.lender-business-exclusion';

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

    await knex.raw('DROP TYPE IF EXISTS "lender_business_exclusions_product_type_enum"');
  },

  async down() {
    // Irreversible — removed module is not restored.
  },
};
