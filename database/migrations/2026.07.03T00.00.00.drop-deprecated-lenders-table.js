'use strict';

/**
 * The `lender` collection type has been removed in favor of `lenders-catalog`,
 * the master lender registry used by the lender-matching engine.
 * This drops the now-unused `lenders` table.
 */

module.exports = {
  async up(knex) {
    const hasTable = await knex.schema.hasTable('lenders');
    if (!hasTable) return;

    const hasMorph = await knex.schema.hasTable('files_related_mph');
    if (hasMorph) {
      await knex('files_related_mph').where({ related_type: 'api::lender.lender' }).del();
    }

    await knex('strapi_core_store_settings')
      .where('key', 'like', '%api::lender.lender%')
      .del();

    await knex.schema.dropTable('lenders');
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('lenders');
    if (hasTable) return;

    await knex.schema.createTable('lenders', (table) => {
      table.increments('id');
      table.string('document_id').notNullable();
      table.string('name').notNullable();
      table.string('interest_rate_offer').notNullable();
      table.integer('match_percentage').defaultTo(90);
      table.string('apply_url').defaultTo('#');
      table.datetime('created_at');
      table.datetime('updated_at');
      table.datetime('published_at');
      table.integer('created_by_id');
      table.integer('updated_by_id');
      table.integer('locale');
    });
  },
};
