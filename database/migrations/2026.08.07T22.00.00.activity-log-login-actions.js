'use strict';

/**
 * Shared /admin login actions for Users & Auth domain.
 */

async function addEnumValues(knex, typnameLike, values) {
  try {
    const rows = await knex.raw(
      `
      SELECT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE ?
      LIMIT 1
    `,
      [typnameLike]
    );
    const typname = rows?.rows?.[0]?.typname;
    if (!typname) return;
    for (const v of values) {
      try {
        await knex.raw(`ALTER TYPE "${typname}" ADD VALUE IF NOT EXISTS '${v}'`);
      } catch {
        // ignore
      }
    }
  } catch {
    // non-Postgres or enum not present
  }
}

module.exports = {
  async up(knex) {
    await addEnumValues(knex, '%activity_logs_action%', [
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
    ]);
  },

  async down() {
    // enum values retained on rollback
  },
};
