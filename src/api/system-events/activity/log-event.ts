import type { Core } from '@strapi/strapi';
import {
  categoryFromAction,
  isValidCategory,
  type ActivityCategory,
} from './categories';

export type LogEventParams = {
  action: string;
  description?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  model?: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  userId?: string;
  leadId?: number | string | null;
  leadName?: string | null;
  category?: ActivityCategory | string;
  correlationId?: string | null;
};

export function coerceLeadId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export function resolveLeadFields(params: LogEventParams): {
  leadId: number | null;
  leadName: string | null;
  correlationId: string | null;
} {
  const meta = (params.metadata && typeof params.metadata === 'object'
    ? params.metadata
    : {}) as Record<string, unknown>;

  const leadId =
    coerceLeadId(params.leadId) ??
    coerceLeadId(meta.leadId) ??
    null;

  let leadName: string | null =
    (params.leadName != null && String(params.leadName).trim()) ||
    (meta.leadName != null && String(meta.leadName).trim()) ||
    null;

  if (!leadName && meta.data && typeof meta.data === 'object') {
    const fullName = (meta.data as Record<string, unknown>).fullName;
    if (fullName != null && String(fullName).trim()) {
      leadName = String(fullName).trim();
    }
  }

  const correlationId =
    (params.correlationId != null && String(params.correlationId).trim()) ||
    (meta.runId != null && String(meta.runId).trim()) ||
    (meta.correlationId != null && String(meta.correlationId).trim()) ||
    null;

  return { leadId, leadName, correlationId };
}

/** Persist one activity_logs row (Activity Logs domain). */
export async function logEvent(
  strapi: Core.Strapi,
  params: LogEventParams
): Promise<void> {
  try {
    const settings = (await strapi.db
      .query('api::global-setting.global-setting')
      .findOne({})) as { activityLoggingIsEnabled?: boolean | null } | null;
    const isLoggingEnabled = settings
      ? settings.activityLoggingIsEnabled !== false
      : true;

    if (
      !isLoggingEnabled &&
      params.severity !== 'critical' &&
      params.severity !== 'error'
    ) {
      return;
    }

    const {
      action,
      description,
      severity,
      model,
      metadata,
      ipAddress,
      userId,
    } = params;

    const { leadId, leadName, correlationId } = resolveLeadFields(params);
    const category = isValidCategory(params.category)
      ? params.category
      : categoryFromAction(action);

    await strapi.db.query('api::system-events.activity-log').create({
      data: {
        action,
        description,
        severity: severity || 'info',
        model,
        metadata: metadata || {},
        ipAddress,
        userId,
        leadId,
        leadName,
        category,
        correlationId,
        publishedAt: new Date(),
      },
    });
  } catch {
    // never break callers on log failure
  }
}
