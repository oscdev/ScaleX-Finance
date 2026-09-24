import type { Core } from '@strapi/strapi';
import { logEvent, resolveLeadFields, type LogEventParams } from '../activity/log-event';

const NOTIFICATION_DEDUPE_WINDOW_MS = 120_000;

/** Actions that should not spam when fired repeatedly for the same lead/run. */
const DEDUPE_NOTIFICATION_ACTIONS = new Set([
  'BUREAU_EXTRACT_STARTED',
  'BUREAU_EXTRACT_COMPLETED',
  'BUREAU_EXTRACT_FAILED',
  'PL_ELIGIBILITY_RUN_COMPLETE',
  'BL_ELIGIBILITY_RUN_COMPLETE',
  'PL_SCORE_RUN_DONE',
  'BL_SCORE_RUN_DONE',
  'AI_MATCH_GENERATED',
  'LEAD_ADVISOR_ASSIGNED',
  'LOAN_ASSIGNMENT_CHANGED',
]);

function readMeta(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

/**
 * Write an activity row unless an equivalent notification was logged recently
 * (same action + leadId + correlationId, or same action + leadId within window).
 * For LEAD_ADVISOR_ASSIGNED, also match metadata.field so Advisor vs Parent both log.
 */
export async function logEventDeduped(
  strapi: Core.Strapi,
  params: LogEventParams,
  windowMs = NOTIFICATION_DEDUPE_WINDOW_MS
): Promise<void> {
  if (!DEDUPE_NOTIFICATION_ACTIONS.has(params.action)) {
    return logEvent(strapi, params);
  }

  try {
    const { leadId, correlationId } = resolveLeadFields(params);
    if (!leadId) {
      return logEvent(strapi, params);
    }

    const where: Record<string, unknown> = {
      action: params.action,
      leadId,
    };

    if (correlationId) {
      where.correlationId = correlationId;
    } else {
      where.createdAt = { $gt: new Date(Date.now() - windowMs) };
    }

    const fieldHint =
      params.action === 'LEAD_ADVISOR_ASSIGNED'
        ? String(readMeta(params.metadata).field || '')
        : '';

    if (fieldHint) {
      const recent = await strapi.db
        .query('api::system-events.activity-log')
        .findMany({
          where,
          orderBy: { createdAt: 'desc' },
          limit: 10,
        });
      const dup = (recent || []).find((row: { metadata?: unknown }) => {
        const m = readMeta(row.metadata);
        return String(m.field || '') === fieldHint;
      });
      if (dup) return;
      return logEvent(strapi, params);
    }

    const existing = await strapi.db
      .query('api::system-events.activity-log')
      .findOne({ where, orderBy: { createdAt: 'desc' } });
    if (existing) return;

    return logEvent(strapi, params);
  } catch {
    return logEvent(strapi, params);
  }
}
