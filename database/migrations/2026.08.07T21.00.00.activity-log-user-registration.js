'use strict';

/**
 * USER_REGISTRATION category + admin/advisor registration actions; backfill advisor auth events.
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
    const hasTable = await knex.schema.hasTable('activity_logs');
    if (!hasTable) return;

    await addEnumValues(knex, '%activity_logs_action%', [
      'ADVISOR_APPROVED',
      'ADMIN_USER_CREATED',
    ]);

    await addEnumValues(knex, '%activity_logs_category%', ['USER_REGISTRATION']);

    try {
      await knex('activity_logs')
        .whereIn('action', [
          'ADVISOR_LOGIN_SUCCESS',
          'ADVISOR_LOGIN_FAILURE',
          'ADVISOR_REGISTRATION_SUCCESS',
          'ADVISOR_REGISTRATION_FAILURE',
        ])
        .update({ category: 'USER_REGISTRATION' });
    } catch {
      // ignore
    }
  },

  async down() {
    // enum values retained on rollback
  },
};
