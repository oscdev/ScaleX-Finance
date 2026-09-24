'use strict';

/**
 * Drop unused Strapi scaffolding table for removed api::email.email single type.
 * Outbound mail uses Nodemailer; audit lives in activity_logs.
 */
async function up(knex) {
  await knex.schema.dropTableIfExists('emails');
}

async function down() {
  // No recreate — table held no product data.
}

module.exports = { up, down };
