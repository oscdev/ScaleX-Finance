import type { Core } from '@strapi/strapi';
import { isValidCategory } from './categories';
import { normalizeLoanTypeCode } from '../../../utils/loan-type';

/** Per-lender rows live under Eligibility → Lenders; exclude from parent badges / totals. */
const LENDER_SCOPED_ACTIONS = [
  'PL_ELIGIBILITY_LENDER',
  'PL_ELIGIBILITY_RULE',
  'PL_ELIGIBILITY_RULE_SKIP',
  'BL_ELIGIBILITY_LENDER',
  'BL_ELIGIBILITY_RULE',
  'BL_ELIGIBILITY_RULE_SKIP',
  'PL_SCORE_LENDER',
  'PL_SCORE_CRITERION',
  'PL_SCORE_CRITERION_SKIP',
  'PL_SCORE_CRITERION_INACTIVE',
  'BL_SCORE_LENDER',
  'BL_SCORE_CRITERION',
  'BL_SCORE_CRITERION_SKIP',
  'BL_SCORE_CRITERION_INACTIVE',
] as const;

/** Categories whose timeline UI day-dedupes by (UTC-day, action). */
const DAY_DEDUPE_CATEGORIES = [
  'BUREAU_EXTRACTION',
  'LENDER_ELIGIBILITY',
  'LENDER_SCORING',
] as const;

/** Map product string → PL | BL for Activity Log Lead filters (HL/LAP/unknown → null). */
function toPlBlFilterCode(raw?: string | null): 'PL' | 'BL' | null {
  const code = normalizeLoanTypeCode(raw);
  if (code === 'PL' || code === 'BL') return code;
  return null;
}

/**
 * Batch-resolve PL/BL for lead cards: lead.selected_product first,
 * else latest loan_applications.loan_type.
 */
async function resolveLeadLoanTypes(
  knex: any,
  leadIds: number[]
): Promise<Map<number, 'PL' | 'BL' | null>> {
  const map = new Map<number, 'PL' | 'BL' | null>();
  for (const id of leadIds) map.set(id, null);
  if (!leadIds.length) return map;

  try {
    const leads = await knex('leads')
      .whereIn('id', leadIds)
      .select('id', 'selected_product');
    for (const row of leads as any[]) {
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      const code = toPlBlFilterCode(row.selected_product);
      if (code) map.set(id, code);
    }

    const missing = leadIds.filter((id) => map.get(id) == null);
    if (missing.length) {
      const apps = await knex('loan_applications')
        .whereIn('lead_id', missing)
        .select('lead_id', 'loan_type', 'id')
        .orderBy('id', 'desc');
      const seen = new Set<number>();
      for (const row of apps as any[]) {
        const id = Number(row.lead_id);
        if (!Number.isFinite(id) || seen.has(id)) continue;
        seen.add(id);
        const code = toPlBlFilterCode(row.loan_type);
        if (code) map.set(id, code);
      }
    }
  } catch {
    // non-fatal — leave nulls
  }

  return map;
}

/** Aggregate activity rows into one parent card per leadId. */
export async function listByLead(
  strapi: Core.Strapi,
  opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(1, Number(opts?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 25));
  const search = (opts?.search || '').trim().toLowerCase();

  const knex = strapi.db.connection;
  try {
    let base = knex('activity_logs').whereNotNull('lead_id');

    if (search) {
      if (/^\d+$/.test(search)) {
        base = base.andWhere('lead_id', Number(search));
      } else {
        base = base.andWhereRaw('LOWER(COALESCE(lead_name, \'\')) LIKE ?', [
          `%${search}%`,
        ]);
      }
    }

    const rows = await base
      .clone()
      .select(
        'lead_id',
        knex.raw('MAX(lead_name) as lead_name'),
        knex.raw('MAX(created_at) as last_activity_at'),
        knex.raw(`
          CASE
            WHEN BOOL_OR(severity = 'critical') THEN 'critical'
            WHEN BOOL_OR(severity = 'error') THEN 'error'
            WHEN BOOL_OR(severity = 'warning') THEN 'warning'
            ELSE 'info'
          END as latest_severity
        `)
      )
      .groupBy('lead_id')
      .orderByRaw('MAX(created_at) DESC');

    const total = rows.length;
    const offset = (page - 1) * pageSize;
    const pageRows = rows.slice(offset, offset + pageSize);

    const leadIds = pageRows
      .map((r: any) => Number(r.lead_id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const badgeMap = new Map<number, Record<string, number>>();
    const loanTypeMap = await resolveLeadLoanTypes(knex, leadIds);

    if (leadIds.length) {
      // Bureau / Eligibility / Scoring: one of each action per UTC day (matches timeline collapse).
      const deduped = await knex('activity_logs')
        .whereIn('lead_id', leadIds)
        .whereIn('category', [...DAY_DEDUPE_CATEGORIES])
        .whereNotIn('action', [...LENDER_SCOPED_ACTIONS])
        .select(
          'lead_id',
          'category',
          knex.raw(`
            COUNT(DISTINCT (
              DATE((created_at AT TIME ZONE 'UTC'))::text || '|' || action
            ))::int as count
          `)
        )
        .groupBy('lead_id', 'category');

      for (const c of deduped as any[]) {
        const id = Number(c.lead_id);
        if (!Number.isFinite(id)) continue;
        const map = badgeMap.get(id) || {};
        map[String(c.category)] = Number(c.count);
        badgeMap.set(id, map);
      }

      // Other lead categories (Lead Form, Loan App, Status, …): raw non-lender counts.
      const others = await knex('activity_logs')
        .whereIn('lead_id', leadIds)
        .whereNotNull('category')
        .whereNotIn('category', [...DAY_DEDUPE_CATEGORIES, 'EMAIL'])
        .whereNotIn('action', [...LENDER_SCOPED_ACTIONS])
        .select('lead_id', 'category')
        .count('* as count')
        .groupBy('lead_id', 'category');

      for (const c of others as any[]) {
        const id = Number(c.lead_id);
        if (!Number.isFinite(id)) continue;
        const map = badgeMap.get(id) || {};
        map[String(c.category)] = Number(c.count);
        badgeMap.set(id, map);
      }
    }

    return {
      data: pageRows.map((r: any) => {
        const leadId = Number(r.lead_id);
        const categoryCounts = badgeMap.get(leadId) || {};
        // Match collapsed Lead timeline: sum of display badges (day-deduped for
        // Bureau / Eligibility / Scoring; no EMAIL / per-lender rows).
        const eventCount = Object.values(categoryCounts).reduce(
          (sum, n) => sum + Number(n || 0),
          0
        );
        return {
          leadId,
          leadName: r.lead_name || null,
          lastActivityAt: r.last_activity_at,
          eventCount,
          latestSeverity: r.latest_severity || 'info',
          categoryCounts,
          loanType: loanTypeMap.get(leadId) ?? null,
        };
      }),
      meta: { page, pageSize, total },
    };
  } catch (err: any) {
    strapi.log.warn(`[ActivityLog] listByLead failed: ${err?.message || err}`);
    return { data: [], meta: { page, pageSize, total: 0 } };
  }
}

export async function listForLead(
  strapi: Core.Strapi,
  leadId: number,
  opts?: { category?: string; page?: number; pageSize?: number }
) {
  const page = Math.max(1, Number(opts?.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(opts?.pageSize) || 100));
  const where: Record<string, unknown> = { leadId };
  if (opts?.category && opts.category !== 'ALL' && isValidCategory(opts.category)) {
    where.category = opts.category;
  }

  const [results, total] = await Promise.all([
    strapi.db.query('api::system-events.activity-log').findMany({
      where,
      orderBy: { createdAt: 'desc' },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    strapi.db.query('api::system-events.activity-log').count({ where }),
  ]);

  return {
    data: results,
    meta: { page, pageSize, total: Number(total) },
  };
}

/** Flat chronological list across all activity rows (lead-tied + system). */
export async function listEvents(
  strapi: Core.Strapi,
  opts?: {
    search?: string;
    category?: string;
    severity?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(1, Number(opts?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
  const search = (opts?.search || '').trim();
  const severity = (opts?.severity || '').trim().toLowerCase();
  const validSeverities = new Set(['info', 'warning', 'error', 'critical']);

  const knex = strapi.db.connection;
  try {
    let q = knex('activity_logs').select('*');

    if (opts?.category && opts.category !== 'ALL' && isValidCategory(opts.category)) {
      q = q.andWhere('category', opts.category);
    }

    if (severity && validSeverities.has(severity)) {
      q = q.andWhere('severity', severity);
    }

    if (search) {
      if (/^\d+$/.test(search)) {
        const n = Number(search);
        q = q.andWhere((builder) => {
          builder
            .where('lead_id', n)
            .orWhereRaw('action ILIKE ?', [`%${search}%`])
            .orWhereRaw('COALESCE(description, \'\') ILIKE ?', [`%${search}%`]);
        });
      } else {
        const like = `%${search.toLowerCase()}%`;
        q = q.andWhere((builder) => {
          builder
            .whereRaw('LOWER(COALESCE(lead_name, \'\')) LIKE ?', [like])
            .orWhereRaw('LOWER(action) LIKE ?', [like])
            .orWhereRaw('LOWER(COALESCE(description, \'\')) LIKE ?', [like]);
        });
      }
    }

    const countRow = await q
      .clone()
      .clearSelect()
      .count<{ count: string | number }[]>({ count: '*' })
      .first();
    const total = Number((countRow as any)?.count ?? 0);

    const rows = await q
      .clone()
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const data = rows.map((r: any) => ({
      id: r.id,
      action: r.action,
      description: r.description,
      severity: r.severity,
      category: r.category,
      correlationId: r.correlation_id ?? r.correlationId ?? null,
      leadId: r.lead_id != null ? Number(r.lead_id) : r.leadId ?? null,
      leadName: r.lead_name ?? r.leadName ?? null,
      metadata: r.metadata ?? {},
      model: r.model,
      createdAt: r.created_at ?? r.createdAt,
    }));

    return { data, meta: { page, pageSize, total } };
  } catch (err: any) {
    strapi.log.warn(`[ActivityLog] listEvents failed: ${err?.message || err}`);
    return { data: [], meta: { page, pageSize, total: 0 } };
  }
}
