import {
  normalizeEventMetadata,
  type ActivityEvent,
} from './useLeadActivityTimeline';

const LENDER_SCOPED_ACTIONS = new Set([
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
]);

const BUREAU_ACTIONS = new Set([
  'BUREAU_EXTRACT_STARTED',
  'BUREAU_EXTRACT_COMPLETED',
  'BUREAU_EXTRACT_FAILED',
]);

const SUMMARY_DEDUP_ACTIONS = new Set([
  'PL_ELIGIBILITY_RUN_START',
  'PL_ELIGIBILITY_RUN_COMPLETE',
  'PL_ELIGIBILITY_BLOCKED',
  'PL_ELIGIBILITY_CONNECTION_FAILED',
  'BL_ELIGIBILITY_RUN_START',
  'BL_ELIGIBILITY_RUN_COMPLETE',
  'BL_ELIGIBILITY_BLOCKED',
  'BL_ELIGIBILITY_CONNECTION_FAILED',
  'PL_SCORE_RUN_START',
  'PL_SCORE_RUN_DONE',
  'PL_SCORE_BLOCKED',
  'PL_SCORE_RANK_COMPLETE',
  'BL_SCORE_RUN_START',
  'BL_SCORE_RUN_DONE',
  'BL_SCORE_BLOCKED',
  'BL_SCORE_RANK_COMPLETE',
  'AI_MATCH_GENERATED',
]);

export type LenderBucket = {
  lenderCode: string;
  lenderName: string;
  events: ActivityEvent[];
};

export type GroupedLeadEvents = {
  /** Flat timeline rows (run summaries, non-lender, collapsed bureau). */
  timeline: ActivityEvent[];
  /** Active criteria lenders with nested detail events. */
  lenderBuckets: LenderBucket[];
};

function dayKey(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function leadDayKey(event: ActivityEvent): string {
  const lead = event.leadId != null ? String(event.leadId) : '';
  return `${lead}|${dayKey(event.createdAt)}`;
}

function isTerminalBureau(action: string): boolean {
  return action === 'BUREAU_EXTRACT_COMPLETED' || action === 'BUREAU_EXTRACT_FAILED';
}

/**
 * Per lead+day: keep one STARTED + one terminal (prefer COMPLETED over FAILED,
 * then newest). Collapses auto+manual Completeds into a single pair.
 */
export function collapseBureauEvents(events: ActivityEvent[]): ActivityEvent[] {
  const bureau: ActivityEvent[] = [];
  const other: ActivityEvent[] = [];

  for (const event of events) {
    if (BUREAU_ACTIONS.has(event.action)) bureau.push(event);
    else other.push(event);
  }

  const byDay = new Map<
    string,
    { started?: ActivityEvent; terminal?: ActivityEvent }
  >();

  for (const event of bureau) {
    const key = leadDayKey(event);
    let slot = byDay.get(key);
    if (!slot) {
      slot = {};
      byDay.set(key, slot);
    }

    if (event.action === 'BUREAU_EXTRACT_STARTED') {
      if (
        !slot.started ||
        new Date(event.createdAt).getTime() > new Date(slot.started.createdAt).getTime()
      ) {
        slot.started = event;
      }
      continue;
    }

    if (!isTerminalBureau(event.action)) continue;

    if (!slot.terminal) {
      slot.terminal = event;
      continue;
    }

    const prev = slot.terminal;
    const preferFailed =
      prev.action === 'BUREAU_EXTRACT_COMPLETED' &&
      event.action === 'BUREAU_EXTRACT_FAILED';
    const preferCompleted =
      prev.action === 'BUREAU_EXTRACT_FAILED' &&
      event.action === 'BUREAU_EXTRACT_COMPLETED';
    const newer =
      new Date(event.createdAt).getTime() > new Date(prev.createdAt).getTime();

    if (preferCompleted || (newer && !preferFailed)) {
      slot.terminal = event;
    }
  }

  const collapsedBureau: ActivityEvent[] = [];
  for (const slot of byDay.values()) {
    if (slot.started) collapsedBureau.push(slot.started);
    if (slot.terminal) collapsedBureau.push(slot.terminal);
  }

  return [...other, ...collapsedBureau].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/** Keep one of each summary action per lead+UTC-day (ignore correlationId). */
export function collapseSummaryEvents(events: ActivityEvent[]): ActivityEvent[] {
  const kept: ActivityEvent[] = [];
  const seen = new Map<string, ActivityEvent>();

  for (const event of events) {
    if (!SUMMARY_DEDUP_ACTIONS.has(event.action)) {
      kept.push(event);
      continue;
    }
    const key = `${event.action}|${leadDayKey(event)}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, event);
      continue;
    }
    if (new Date(event.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
      seen.set(key, event);
    }
  }

  for (const event of seen.values()) kept.push(event);

  return kept.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function lenderFromEvent(event: ActivityEvent): { code: string; name: string } | null {
  const meta = normalizeEventMetadata(event.metadata);
  const code = String(meta.lenderCode || '').trim();
  if (!code) return null;
  const name = String(meta.lenderName || code).trim() || code;
  return { code, name };
}

/**
 * Split lead events into timeline summaries + expandable lender buckets.
 * Only lenders in `activeLenderCodes` (active PL/BL criteria) get buckets.
 */
export function groupLenderPipelineEvents(
  events: ActivityEvent[],
  activeLenderCodes: Set<string>
): GroupedLeadEvents {
  const afterBureau = collapseBureauEvents(events);
  const collapsed = collapseSummaryEvents(afterBureau);
  const timeline: ActivityEvent[] = [];
  const bucketMap = new Map<string, LenderBucket>();

  for (const event of collapsed) {
    if (!LENDER_SCOPED_ACTIONS.has(event.action)) {
      timeline.push(event);
      continue;
    }
    const lender = lenderFromEvent(event);
    if (!lender || !activeLenderCodes.has(lender.code)) continue;
    let bucket = bucketMap.get(lender.code);
    if (!bucket) {
      bucket = { lenderCode: lender.code, lenderName: lender.name, events: [] };
      bucketMap.set(lender.code, bucket);
    }
    if (!bucket.lenderName || bucket.lenderName === bucket.lenderCode) {
      bucket.lenderName = lender.name;
    }
    bucket.events.push(event);
  }

  const lenderBuckets = [...bucketMap.values()].sort((a, b) =>
    a.lenderName.localeCompare(b.lenderName)
  );
  for (const bucket of lenderBuckets) {
    bucket.events.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  timeline.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return { timeline, lenderBuckets };
}

/** One card per active criteria lender code; merge event buckets when present. */
export function buildActiveLenderBuckets(
  activeLenderCodes: string[],
  eventBuckets: LenderBucket[]
): LenderBucket[] {
  const byCode = new Map(eventBuckets.map((b) => [b.lenderCode, b]));
  return [...activeLenderCodes]
    .map((code) => {
      const trimmed = String(code || '').trim();
      if (!trimmed) return null;
      const existing = byCode.get(trimmed);
      return (
        existing || {
          lenderCode: trimmed,
          lenderName: trimmed,
          events: [] as ActivityEvent[],
        }
      );
    })
    .filter((b): b is LenderBucket => b != null)
    .sort((a, b) => a.lenderName.localeCompare(b.lenderName));
}

const SCORE_LENDER_ACTIONS = new Set(['PL_SCORE_LENDER', 'BL_SCORE_LENDER']);

function latestScoreTotal(bucket: LenderBucket): number {
  let best: { t: number; score: number } | null = null;
  for (const event of bucket.events) {
    if (!SCORE_LENDER_ACTIONS.has(event.action)) continue;
    const meta = normalizeEventMetadata(event.metadata);
    const raw = meta.totalScore ?? meta.score;
    const score = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(score)) continue;
    const t = new Date(event.createdAt).getTime();
    if (!best || t > best.t) best = { t, score };
  }
  return best?.score ?? Number.NEGATIVE_INFINITY;
}

/**
 * Scoring tab: product-scoped active codes that have a SCORE_LENDER event,
 * ordered by latest totalScore descending (then lenderCode).
 */
export function buildScoredLenderBuckets(
  activeLenderCodes: string[],
  eventBuckets: LenderBucket[]
): LenderBucket[] {
  const active = new Set(
    activeLenderCodes.map((c) => String(c || '').trim()).filter(Boolean)
  );
  return eventBuckets
    .filter((bucket) => {
      if (!active.has(bucket.lenderCode)) return false;
      return bucket.events.some((e) => SCORE_LENDER_ACTIONS.has(e.action));
    })
    .slice()
    .sort((a, b) => {
      const sa = latestScoreTotal(a);
      const sb = latestScoreTotal(b);
      if (sb !== sa) return sb - sa;
      return a.lenderCode.localeCompare(b.lenderCode);
    });
}
