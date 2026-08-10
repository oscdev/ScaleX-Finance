'use strict';

/**
 * Lead Activity Timeline: leadId, leadName, category, correlationId columns,
 * new action/category enum values, and backfill leadId from metadata.
 */

async function addEnumValues(knex, typnameLike, values) {
  try {
    const rows = await knex.raw(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE ?
      LIMIT 1
    `, [typnameLike]);
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

    const hasLeadId = await knex.schema.hasColumn('activity_logs', 'lead_id');
    if (!hasLeadId) {
      await knex.schema.alterTable('activity_logs', (t) => {
        t.integer('lead_id').nullable().index();
        t.string('lead_name').nullable();
        t.string('category').nullable().index();
        t.string('correlation_id').nullable().index();
      });
    }

    await addEnumValues(knex, '%activity_logs_action%', [
      'LEAD_REMARK_ADDED',
      'LOAN_APP_SUBMITTED',
      'LOAN_APP_SUBMIT_FAILED',
      'BUREAU_EXTRACT_STARTED',
      'BUREAU_EXTRACT_COMPLETED',
      'BUREAU_EXTRACT_FAILED',
    ]);

    await addEnumValues(knex, '%activity_logs_category%', [
      'LEAD_FORM',
      'LOAN_APPLICATION',
      'EMAIL',
      'STATUS_REMARKS',
      'BUREAU_EXTRACTION',
      'LENDER_ELIGIBILITY',
      'LENDER_SCORING',
      'SYSTEM',
    ]);

    // Backfill leadId from metadata.leadId where missing
    try {
      await knex.raw(`
        UPDATE activity_logs
        SET lead_id = (metadata->>'leadId')::integer
        WHERE lead_id IS NULL
          AND metadata IS NOT NULL
          AND metadata->>'leadId' ~ '^[0-9]+$'
      `);
    } catch {
      // metadata may not be jsonb on all envs
    }

    // Backfill leadName from metadata when present
    try {
      await knex.raw(`
        UPDATE activity_logs
        SET lead_name = COALESCE(
          metadata->>'leadName',
          metadata->'data'->>'fullName',
          lead_name
        )
        WHERE lead_id IS NOT NULL
          AND (lead_name IS NULL OR lead_name = '')
          AND metadata IS NOT NULL
      `);
    } catch {
      // ignore
    }

    // Backfill correlationId from metadata.runId
    try {
      await knex.raw(`
        UPDATE activity_logs
        SET correlation_id = metadata->>'runId'
        WHERE correlation_id IS NULL
          AND metadata IS NOT NULL
          AND metadata->>'runId' IS NOT NULL
          AND metadata->>'runId' <> ''
      `);
    } catch {
      // ignore
    }

    // Backfill category from action prefix / known values
    try {
      await knex.raw(`
        UPDATE activity_logs SET category = CASE
          WHEN action IN ('LEAD_CREATED','LEAD_SUBMISSION_SUCCESS','LEAD_SUBMISSION_FAILURE') THEN 'LEAD_FORM'
          WHEN action IN ('LOAN_APP_SUBMITTED','LOAN_APP_SUBMIT_FAILED','LOAN_STATUS_CHANGED') THEN 'LOAN_APPLICATION'
          WHEN action IN ('EMAIL_DISPATCHED','EMAIL_FAILED','EMAIL_SKIPPED') THEN 'EMAIL'
          WHEN action IN ('LEAD_STATUS_CHANGED','LEAD_REMARK_ADDED') THEN 'STATUS_REMARKS'
          WHEN action LIKE 'BUREAU_%' THEN 'BUREAU_EXTRACTION'
          WHEN action LIKE 'PL_ELIGIBILITY_%' OR action = 'AI_MATCH_GENERATED' THEN 'LENDER_ELIGIBILITY'
          WHEN action LIKE 'PL_SCORE_%' THEN 'LENDER_SCORING'
          ELSE 'SYSTEM'
        END
        WHERE category IS NULL
      `);
    } catch {
      // ignore
    }
  },

  async down(knex) {
    const hasTable = await knex.schema.hasTable('activity_logs');
    if (!hasTable) return;
    const hasLeadId = await knex.schema.hasColumn('activity_logs', 'lead_id');
    if (!hasLeadId) return;
    await knex.schema.alterTable('activity_logs', (t) => {
      t.dropColumn('lead_id');
      t.dropColumn('lead_name');
      t.dropColumn('category');
      t.dropColumn('correlation_id');
    });
  },
};
