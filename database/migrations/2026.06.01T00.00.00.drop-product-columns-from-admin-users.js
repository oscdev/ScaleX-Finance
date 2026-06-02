'use strict';

/**
 * Drops leftover product_id and product columns from admin_users.
 * Product assignment is handled by the user_product_mappings table instead.
 */

module.exports = {
  async up(knex) {
    const hasProduct = await knex.schema.hasColumn('admin_users', 'product');
    const hasProductId = await knex.schema.hasColumn('admin_users', 'product_id');

    if (!hasProduct && !hasProductId) return;

    await knex.schema.alterTable('admin_users', (table) => {
      if (hasProduct) table.dropColumn('product');
      if (hasProductId) table.dropColumn('product_id');
    });
  },

  async down(knex) {
    const hasProduct = await knex.schema.hasColumn('admin_users', 'product');
    const hasProductId = await knex.schema.hasColumn('admin_users', 'product_id');

    await knex.schema.alterTable('admin_users', (table) => {
      if (!hasProduct) table.string('product', 255).nullable();
      if (!hasProductId) table.integer('product_id').nullable();
    });
  },
};
