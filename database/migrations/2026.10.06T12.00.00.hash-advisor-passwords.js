'use strict';

/**
 * One-time: hash plaintext advisors.password with bcryptjs cost 10 (Strapi standard)
 * and copy the same hash onto matching admin_users by email.
 * Idempotent — skips rows that already look like bcrypt ($2a$ / $2b$ / $2y$).
 */

const bcrypt = require('bcryptjs');

const BCRYPT_RE = /^\$2[aby]?\$\d{2}\$/;

const isBcryptHash = (value) => typeof value === 'string' && BCRYPT_RE.test(value);

async function up(knex) {
  const hasAdvisors = await knex.schema.hasTable('advisors');
  if (!hasAdvisors) return;

  const hasPassword = await knex.schema.hasColumn('advisors', 'password');
  if (!hasPassword) return;

  const hasAdminUsers = await knex.schema.hasTable('admin_users');

  const rows = await knex('advisors').select('id', 'email', 'password');
  for (const row of rows) {
    const current = row.password;
    if (!current || isBcryptHash(current)) continue;

    const hash = await bcrypt.hash(String(current), 10);
    await knex('advisors').where({ id: row.id }).update({ password: hash });

    if (!hasAdminUsers || !row.email) continue;

    const email = String(row.email).trim();
    if (!email) continue;

    // Case-insensitive email match
    await knex('admin_users')
      .whereRaw('LOWER(email) = ?', [email.toLowerCase()])
      .update({ password: hash });
  }
}

async function down() {
  // Irreversible — plaintext cannot be recovered from bcrypt.
}

module.exports = { up, down };
