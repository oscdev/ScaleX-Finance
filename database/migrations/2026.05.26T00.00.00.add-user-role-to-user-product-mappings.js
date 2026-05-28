'use strict';

/**
 * Adds user_role column to user_product_mappings table.
 */
module.exports = {
  async up(knex) {
    const hasColumn = await knex.schema.hasColumn('user_product_mappings', 'user_role');
    if (!hasColumn) {
      await knex.schema.alterTable('user_product_mappings', (table) => {
        table.string('user_role', 255).nullable();
      });
    }
  },

  async down(knex) {
    const hasColumn = await knex.schema.hasColumn('user_product_mappings', 'user_role');
    if (hasColumn) {
      await knex.schema.alterTable('user_product_mappings', (table) => {
        table.dropColumn('user_role');
      });
    }
  },
};
