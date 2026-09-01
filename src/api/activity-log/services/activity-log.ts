import { factories } from '@strapi/strapi';
import {
  categoryFromAction,
  isValidCategory,
  type ActivityCategory,
} from '../utils/categories';

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

function coerceLeadId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function resolveLeadFields(params: LogEventParams): {
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

const NOTIFICATION_DEDUPE_WINDOW_MS = 120_000;

/** Actions that should not spam the notification bell when fired repeatedly for the same lead/run. */
const DEDUPE_NOTIFICATION_ACTIONS = new Set([
  'BUREAU_EXTRACT_STARTED',
  'BUREAU_EXTRACT_COMPLETED',
  'BUREAU_EXTRACT_FAILED',
]);

export default factories.createCoreService(
  'api::activity-log.activity-log' as any,
  ({ strapi }) => ({
    /** Alias used by some PL scoring call sites. */
    async log(params: LogEventParams) {
      return this.logEvent(params);
    },

    async logEvent(params: LogEventParams) {
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

        await strapi.db.query('api::activity-log.activity-log').create({
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
    },

    /**
     * Write an activity row unless an equivalent notification was logged recently
     * (same action + leadId + correlationId, or same action + leadId within window).
     */
    async logEventDeduped(
      params: LogEventParams,
      windowMs = NOTIFICATION_DEDUPE_WINDOW_MS
    ) {
      if (!DEDUPE_NOTIFICATION_ACTIONS.has(params.action)) {
        return this.logEvent(params);
      }

      try {
        const { leadId, correlationId } = resolveLeadFields(params);
        if (!leadId) {
          return this.logEvent(params);
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

        const existing = await strapi.db
          .query('api::activity-log.activity-log')
          .findOne({ where, orderBy: { createdAt: 'desc' } });
        if (existing) return;

        return this.logEvent(params);
      } catch {
        return this.logEvent(params);
      }
    },

    /**
     * Aggregate activity rows into one parent card per leadId.
     */
    async listByLead(opts?: {
      search?: string;
      page?: number;
      pageSize?: number;
    }) {
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
            'lead_id as leadId',
            knex.raw('MAX(lead_name) as "leadName"'),
            knex.raw('MAX(created_at) as "lastActivityAt"'),
            knex.raw('COUNT(*)::int as "eventCount"'),
            knex.raw(`
              CASE
                WHEN BOOL_OR(severity = 'critical') THEN 'critical'
                WHEN BOOL_OR(severity = 'error') THEN 'error'
                WHEN BOOL_OR(severity = 'warning') THEN 'warning'
                ELSE 'info'
              END as "latestSeverity"
            `)
          )
          .groupBy('lead_id')
          .orderByRaw('MAX(created_at) DESC');

        const total = rows.length;
        const offset = (page - 1) * pageSize;
        const pageRows = rows.slice(offset, offset + pageSize);

        const leadIds = pageRows.map((r: any) => r.leadId);
        const badgeMap = new Map<number, Record<string, number>>();
        if (leadIds.length) {
          const cats = await knex('activity_logs')
            .whereIn('lead_id', leadIds)
            .whereNotNull('category')
            .select('lead_id as leadId', 'category')
            .count('* as count')
            .groupBy('lead_id', 'category');
          for (const c of cats) {
            const id = Number(c.leadId);
            const map = badgeMap.get(id) || {};
            map[String(c.category)] = Number(c.count);
            badgeMap.set(id, map);
          }
        }

        return {
          data: pageRows.map((r: any) => ({
            leadId: Number(r.leadId),
            leadName: r.leadName || null,
            lastActivityAt: r.lastActivityAt,
            eventCount: Number(r.eventCount),
            latestSeverity: r.latestSeverity || 'info',
            categoryCounts: badgeMap.get(Number(r.leadId)) || {},
          })),
          meta: { page, pageSize, total },
        };
      } catch (err: any) {
        strapi.log.warn(
          `[ActivityLog] listByLead failed: ${err?.message || err}`
        );
        return { data: [], meta: { page, pageSize, total: 0 } };
      }
    },

    async listForLead(
      leadId: number,
      opts?: { category?: string; page?: number; pageSize?: number }
    ) {
      const page = Math.max(1, Number(opts?.page) || 1);
      const pageSize = Math.min(200, Math.max(1, Number(opts?.pageSize) || 100));
      const where: Record<string, unknown> = { leadId };
      if (opts?.category && opts.category !== 'ALL' && isValidCategory(opts.category)) {
        where.category = opts.category;
      }

      const [results, total] = await Promise.all([
        strapi.db.query('api::activity-log.activity-log').findMany({
          where,
          orderBy: { createdAt: 'desc' },
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        strapi.db.query('api::activity-log.activity-log').count({ where }),
      ]);

      return {
        data: results,
        meta: { page, pageSize, total: Number(total) },
      };
    },

    /**
     * Flat chronological list across all activity rows (lead-tied + system).
     */
    async listEvents(opts?: {
      search?: string;
      category?: string;
      severity?: string;
      page?: number;
      pageSize?: number;
    }) {
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
        strapi.log.warn(
          `[ActivityLog] listEvents failed: ${err?.message || err}`
        );
        return { data: [], meta: { page, pageSize, total: 0 } };
      }
    },
  })
);
