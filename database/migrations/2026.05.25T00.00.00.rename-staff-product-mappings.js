'use strict';

/**
 * Rename staff_product_mappings → user_product_mappings.
 * The collection now stores product assignments for both Staff and Banker roles.
 */

module.exports = {
    async up(knex) {
        const oldExists = await knex.schema.hasTable('staff_product_mappings');
        if (!oldExists) return; // nothing to migrate

        const newExists = await knex.schema.hasTable('user_product_mappings');
        if (newExists) {
            // Strapi already created the new table from the schema — copy rows across then drop old table
            const rows = await knex('staff_product_mappings').select('*');
            if (rows.length > 0) {
                await knex('user_product_mappings').insert(rows);
            }
            await knex.schema.dropTable('staff_product_mappings');
        } else {
            await knex.schema.renameTable('staff_product_mappings', 'user_product_mappings');
        }
    },

    async down(knex) {
        // No-op: reverting a table rename after data has been copied is destructive
    },
};
