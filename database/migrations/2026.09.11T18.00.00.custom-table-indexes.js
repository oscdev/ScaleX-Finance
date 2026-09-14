'use strict';

/**
 * Additive indexes for all custom content-type tables under src/api/.
 * Phase A: non-unique CREATE INDEX IF NOT EXISTS (safe).
 * Phase B: UNIQUE only when duplicate preflight count is 0 (skip + warn otherwise).
 *
 * Does not recreate schema unique:true indexes or prior migration indexes.
 */

/** @type {Array<{ name: string, table: string, columns: string[], where?: string }>} */
const PHASE_A = [
  // loan_applications
  { name: 'idx_loan_applications_lead_id', table: 'loan_applications', columns: ['lead_id'] },
  { name: 'idx_loan_applications_loan_type', table: 'loan_applications', columns: ['loan_type'] },
  { name: 'idx_loan_applications_status', table: 'loan_applications', columns: ['status'] },
  {
    name: 'idx_loan_applications_assigned_staff_id',
    table: 'loan_applications',
    columns: ['assigned_staff_id'],
    where: 'assigned_staff_id IS NOT NULL',
  },
  {
    name: 'idx_loan_applications_assigned_banker_id',
    table: 'loan_applications',
    columns: ['assigned_banker_id'],
    where: 'assigned_banker_id IS NOT NULL',
  },

  // leads
  { name: 'idx_leads_advisor_referral_id', table: 'leads', columns: ['advisor_referral_id'] },
  { name: 'idx_leads_parent_advisor_id', table: 'leads', columns: ['parent_advisor_id'] },
  { name: 'idx_leads_lead_status', table: 'leads', columns: ['lead_status'] },
  { name: 'idx_leads_selected_product', table: 'leads', columns: ['selected_product'] },
  { name: 'idx_leads_mobile_number', table: 'leads', columns: ['mobile_number'] },
  { name: 'idx_leads_email', table: 'leads', columns: ['email'] },

  // lead_remark
  { name: 'idx_lead_remark_lead_id', table: 'lead_remark', columns: ['lead_id'] },

  // zip lookup (UNIQUEs already from zip-codes-loan-type migration)
  {
    name: 'idx_zip_codes_lender_loan_type_active',
    table: 'zip_codes_to_lenders',
    columns: ['lender_code', 'loan_type', 'is_active'],
  },

  // activity_logs (singles on lead_id/category/correlation_id already exist)
  {
    name: 'idx_activity_logs_lead_id_created_at',
    table: 'activity_logs',
    columns: ['lead_id', 'created_at DESC'],
  },
  { name: 'idx_activity_logs_action', table: 'activity_logs', columns: ['action'] },
  { name: 'idx_activity_logs_severity', table: 'activity_logs', columns: ['severity'] },
  { name: 'idx_activity_logs_created_at', table: 'activity_logs', columns: ['created_at DESC'] },
  {
    name: 'idx_activity_logs_user_id',
    table: 'activity_logs',
    columns: ['user_id'],
    where: 'user_id IS NOT NULL',
  },

  // scoring / mappings / permissions
  {
    name: 'idx_lender_scoring_criteria_loan_type_active',
    table: 'lender_scoring_criteria',
    columns: ['loan_type', 'is_active'],
  },
  {
    name: 'idx_user_product_mappings_admin_user_id',
    table: 'user_product_mappings',
    columns: ['admin_user_id'],
  },
  { name: 'idx_user_product_mappings_product', table: 'user_product_mappings', columns: ['product'] },
  {
    name: 'idx_loan_app_section_permissions_role_id',
    table: 'loan_app_section_permissions',
    columns: ['role_id'],
  },

  // advisors (UNIQUE advisor_id/email already from schema)
  {
    name: 'idx_advisors_status_approved',
    table: 'advisors',
    columns: ['advisor_status'],
    where: "advisor_status = 'Approved'",
  },

  // cibil (UNIQUE lead_id already)
  {
    name: 'idx_cibil_report_summary_loan_application_id',
    table: 'cibil_report_summary',
    columns: ['loan_application_id'],
    where: 'loan_application_id IS NOT NULL',
  },

  // catalog / criteria active filters (UNIQUE lender_code already)
  { name: 'idx_lenders_catalog_is_active', table: 'lenders_catalog', columns: ['is_active'] },
  { name: 'idx_lenders_criteria_pl_is_active', table: 'lenders_criteria_pl', columns: ['is_active'] },
  { name: 'idx_lenders_criteria_bl_is_active', table: 'lenders_criteria_bl', columns: ['is_active'] },

  // products
  { name: 'idx_products_title', table: 'products', columns: ['title'] },

  // CMS single-types (draftAndPublish) — published_at when present
  { name: 'idx_homepage_published_at', table: 'homepage', columns: ['published_at'] },
  { name: 'idx_headers_published_at', table: 'headers', columns: ['published_at'] },
  { name: 'idx_footers_published_at', table: 'footers', columns: ['published_at'] },
  { name: 'idx_global_settings_published_at', table: 'global_settings', columns: ['published_at'] },
  { name: 'idx_about_us_pages_published_at', table: 'about_us_pages', columns: ['published_at'] },
  { name: 'idx_contact_us_pages_published_at', table: 'contact_us_pages', columns: ['published_at'] },
  { name: 'idx_lead_form_page_published_at', table: 'lead_form_page', columns: ['published_at'] },
  {
    name: 'idx_loan_application_pages_published_at',
    table: 'loan_application_pages',
    columns: ['published_at'],
  },
  { name: 'idx_product_page_published_at', table: 'product_page', columns: ['published_at'] },
  {
    name: 'idx_advisor_registration_page_published_at',
    table: 'advisor_registration_page',
    columns: ['published_at'],
  },
];

/** @type {Array<{ name: string, table: string, columns: string[], where?: string, groupBy: string }>} */
const PHASE_B = [
  {
    name: 'uidx_lead_remark_lead_id',
    table: 'lead_remark',
    columns: ['lead_id'],
    where: 'lead_id IS NOT NULL',
    groupBy: 'lead_id',
  },
  {
    name: 'uidx_lender_scoring_criteria_code_loan_type',
    table: 'lender_scoring_criteria',
    columns: ['criterion_code', 'loan_type'],
    groupBy: 'criterion_code, loan_type',
  },
  {
    name: 'uidx_loan_app_section_permissions_role_id',
    table: 'loan_app_section_permissions',
    columns: ['role_id'],
    where: 'role_id IS NOT NULL',
    groupBy: 'role_id',
  },
  {
    name: 'uidx_user_product_mappings_admin_user_product',
    table: 'user_product_mappings',
    columns: ['admin_user_id', 'product'],
    groupBy: 'admin_user_id, product',
  },
  {
    name: 'uidx_products_title',
    table: 'products',
    columns: ['title'],
    where: 'title IS NOT NULL',
    groupBy: 'title',
  },
];

function baseColumnName(colExpr) {
  return String(colExpr).replace(/\s+(ASC|DESC)$/i, '').trim();
}

async function createIndex(knex, { name, table, columns, where, unique }) {
  const hasTable = await knex.schema.hasTable(table);
  if (!hasTable) return false;

  for (const colExpr of columns) {
    const col = baseColumnName(colExpr);
    const hasCol = await knex.schema.hasColumn(table, col);
    if (!hasCol) return false;
  }

  const colSql = columns.join(', ');
  const uniqueSql = unique ? 'UNIQUE ' : '';
  const whereSql = where ? ` WHERE ${where}` : '';
  await knex.raw(
    `CREATE ${uniqueSql}INDEX IF NOT EXISTS ${name} ON ${table} (${colSql})${whereSql}`
  );
  return true;
}

async function countDuplicateGroups(knex, table, groupBy, where) {
  const whereSql = where ? `WHERE ${where}` : '';
  const result = await knex.raw(`
    SELECT COUNT(*)::int AS dup_groups FROM (
      SELECT 1
      FROM ${table}
      ${whereSql}
      GROUP BY ${groupBy}
      HAVING COUNT(*) > 1
    ) d
  `);
  return result?.rows?.[0]?.dup_groups ?? 0;
}

module.exports = {
  async up(knex) {
    for (const spec of PHASE_A) {
      try {
        await createIndex(knex, { ...spec, unique: false });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[custom-table-indexes] Phase A skip ${spec.name}:`,
          err && err.message ? err.message : err
        );
      }
    }

    for (const spec of PHASE_B) {
      try {
        const hasTable = await knex.schema.hasTable(spec.table);
        if (!hasTable) continue;

        const missingCol = [];
        for (const colExpr of spec.columns) {
          const col = baseColumnName(colExpr);
          if (!(await knex.schema.hasColumn(spec.table, col))) missingCol.push(col);
        }
        if (missingCol.length) continue;

        const dups = await countDuplicateGroups(knex, spec.table, spec.groupBy, spec.where);
        if (dups > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[custom-table-indexes] Phase B skip UNIQUE ${spec.name}: ${dups} duplicate group(s) on ${spec.table}(${spec.groupBy})`
          );
          continue;
        }

        await createIndex(knex, { ...spec, unique: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[custom-table-indexes] Phase B skip ${spec.name}:`,
          err && err.message ? err.message : err
        );
      }
    }
  },

  async down(knex) {
    const names = [...PHASE_A, ...PHASE_B].map((s) => s.name);
    for (const name of names) {
      try {
        await knex.raw(`DROP INDEX IF EXISTS ${name}`);
      } catch {
        // ignore
      }
    }
  },
};
