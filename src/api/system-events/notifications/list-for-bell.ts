import type { Core } from '@strapi/strapi';
import { BELL_ACTION_ALLOWLIST } from './bell-actions';
import type { BellLeadScope } from './role-scope';

const BELL_SEVERITIES = ['info', 'warning'] as const;
const ALLOWLIST = new Set(BELL_ACTION_ALLOWLIST);

/**
 * Recent activity rows for the admin notification bell.
 * Admin (mode all): unscoped. Advisor/Staff/Banker: leadId IN associated leads.
 * Only allowlisted summary actions (no per-lender eligibility/scoring spam).
 */
export async function listForBell(
  strapi: Core.Strapi,
  scope: BellLeadScope,
  opts?: { limit?: number }
): Promise<{ data: unknown[] }> {
  const limit = Math.min(50, Math.max(1, Number(opts?.limit) || 20));

  if (scope.mode === 'leadIds' && scope.leadIds.length === 0) {
    return { data: [] };
  }

  const where: Record<string, unknown> = {
    severity: { $in: [...BELL_SEVERITIES] },
    action: { $in: [...ALLOWLIST] },
  };

  if (scope.mode === 'leadIds') {
    where.leadId = { $in: scope.leadIds };
  }

  // Over-fetch then filter in case enum $in misses edge cases; keep newest first.
  const fetchLimit = Math.min(100, Math.max(limit * 3, 40));
  const results = await strapi.db.query('api::system-events.activity-log').findMany({
    where,
    orderBy: { createdAt: 'desc' },
    limit: fetchLimit,
  });

  const filtered = (results || []).filter((row: { action?: string }) =>
    ALLOWLIST.has(String(row.action || ''))
  );

  return { data: filtered.slice(0, limit) };
}
