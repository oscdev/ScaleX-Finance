'use strict';

/**
 * About Us Page and Contact Us Page single types were removed in
 * 2026.10.19T12.00.00.drop-about-and-contact-page-tables, but that migration
 * already ran while a stale compiled `dist/` still registered the types, so
 * Strapi boot recreated their tables and permission rows. This cleanup runs
 * after the clean rebuild and removes the orphans for good.
 */

const TYPES = [
  { table: 'about_us_pages', uid: 'api::about-us-page.about-us-page' },
  { table: 'contact_us_pages', uid: 'api::contact-us-page.contact-us-page' },
];

async function cleanupOne(knex, { table, uid }) {
  const hasMorph = await knex.schema.hasTable('files_related_mph');
  if (hasMorph) {
    await knex('files_related_mph').where({ related_type: uid }).del();
  }

  const hasStore = await knex.schema.hasTable('strapi_core_store_settings');
  if (hasStore) {
    await knex('strapi_core_store_settings').where('key', 'like', `%${uid}%`).del();
  }

  const hasAdminPerms = await knex.schema.hasTable('admin_permissions');
  if (hasAdminPerms) {
    await knex('admin_permissions').where({ subject: uid }).del();
  }

  const hasUserPerms = await knex.schema.hasTable('up_permissions');
  if (hasUserPerms) {
    await knex('up_permissions').where('action', 'like', `${uid}.%`).del();
  }

  const hasTable = await knex.schema.hasTable(table);
  if (hasTable) {
    await knex.schema.dropTable(table);
  }
}

module.exports = {
  async up(knex) {
    for (const type of TYPES) {
      await cleanupOne(knex, type);
    }
  },

  async down() {
    // Single types are not restored.
  },
};
