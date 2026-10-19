'use strict';

/**
 * About Us Page and Contact Us Page single types are removed.
 * Drops about_us_pages and contact_us_pages.
 */

const TYPES = [
  {
    table: 'about_us_pages',
    uid: 'api::about-us-page.about-us-page',
    action: 'api::about-us-page.about-us-page.find',
  },
  {
    table: 'contact_us_pages',
    uid: 'api::contact-us-page.contact-us-page',
    action: 'api::contact-us-page.contact-us-page.find',
  },
];

async function dropOne(knex, { table, uid, action }) {
  const hasMorph = await knex.schema.hasTable('files_related_mph');
  if (hasMorph) {
    await knex('files_related_mph').where({ related_type: uid }).del();
  }

  const hasStore = await knex.schema.hasTable('strapi_core_store_settings');
  if (hasStore) {
    await knex('strapi_core_store_settings').where('key', 'like', `%${uid}%`).del();
  }

  const hasPerms = await knex.schema.hasTable('up_permissions');
  if (hasPerms) {
    await knex('up_permissions').where({ action }).del();
  }

  const hasTable = await knex.schema.hasTable(table);
  if (hasTable) {
    await knex.schema.dropTable(table);
  }
}

module.exports = {
  async up(knex) {
    for (const type of TYPES) {
      await dropOne(knex, type);
    }
  },

  async down() {
    // Single types are not restored.
  },
};
