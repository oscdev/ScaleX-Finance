'use strict';

/**
 * Drop orphan table from former api::email-notification.email-notification
 * (renamed to api::system-events.activity-log → table `emails`).
 */
async function up(knex) {
  await knex.schema.dropTableIfExists('email_notifications');
}

async function down() {
  // no-op — stub singleType table is recreated by Strapi if the old module returned
}

module.exports = { up, down };
