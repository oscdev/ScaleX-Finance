import { useState, type CSSProperties } from 'react';
import {
  CATEGORY_TABS,
  DOMAIN_TABS,
  EMAIL_ACTION_TABS,
  LEAD_PRODUCT_TABS,
  AUTH_ROLE_TABS,
  LEAD_JOURNEY_CATEGORY_ORDER,
  categoryLabel,
  groupEmailEvents,
  eventMatchesAuthRole,
  normalizeEventMetadata,
  useLeadActivityTimeline,
  type ActivityEvent,
  type EmailRunGroup,
} from './useLeadActivityTimeline';
import {
  groupLenderPipelineEvents,
  buildActiveLenderBuckets,
  buildScoredLenderBuckets,
  type LenderBucket,
} from './groupLenderPipelineEvents';
import { styles } from './styles';

function formatTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function severityStyle(sev?: string): CSSProperties {
  if (sev === 'error' || sev === 'critical') {
    return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
  }
  if (sev === 'warning') {
    return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
  }
  return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
}

function categoryBadgeStyle(cat: string): CSSProperties {
  const map: Record<string, CSSProperties> = {
    LEAD_FORM: { background: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc' },
    LOAN_APPLICATION: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    EMAIL: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
    STATUS_REMARKS: { background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' },
    BUREAU_EXTRACTION: { background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8' },
    LENDER_ELIGIBILITY: { background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' },
    LENDER_SCORING: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    USER_REGISTRATION: { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' },
    SYSTEM: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
  };
  return map[cat] || {};
}

const METADATA_LABELS: Record<string, string> = {
  status: 'Status',
  recipient: 'Recipient',
  subject: 'Subject',
  leadId: 'Lead',
  leadName: 'Lead name',
  loanApplicationId: 'Loan application',
  smtpHost: 'SMTP host',
  smtpPort: 'SMTP port',
  error: 'Error',
  skipReason: 'Reason',
  advisorId: 'Advisor',
  adminUserId: 'Admin user',
  role: 'Role',
  raw: 'Raw',
};

const METADATA_ORDER = [
  'status',
  'recipient',
  'subject',
  'leadId',
  'leadName',
  'loanApplicationId',
  'advisorId',
  'adminUserId',
  'role',
  'smtpHost',
  'smtpPort',
  'skipReason',
  'error',
];

const METADATA_SKIP_KEYS = new Set(['template', 'loanApplicationId']);

function humanizeKey(key: string): string {
  if (METADATA_LABELS[key]) return METADATA_LABELS[key];
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatMetaValue(key: string, value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (key === 'leadId' || key === 'loanApplicationId' || key === 'advisorId' || key === 'adminUserId') {
    return `#${value}`;
  }
  return String(value);
}

/** API may return metadata as a JSON string — normalize before `in` / Object.keys. */
function normalizeMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { raw: trimmed };
    } catch {
      return { raw: trimmed };
    }
  }
  return null;
}

function metadataDetailLines(metadata: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const used = new Set<string>();

  for (const key of METADATA_ORDER) {
    if (METADATA_SKIP_KEYS.has(key)) continue;
    if (metadata[key] === undefined) continue;
    const text = formatMetaValue(key, metadata[key]);
    if (!text) continue;
    lines.push(`${humanizeKey(key)}: ${text}`);
    used.add(key);
  }

  for (const key of Object.keys(metadata).sort()) {
    if (used.has(key) || METADATA_SKIP_KEYS.has(key)) continue;
    const text = formatMetaValue(key, metadata[key]);
    if (!text) continue;
    lines.push(`${humanizeKey(key)}: ${text}`);
  }

  return lines;
}

function EventRow({
  event,
  showLeadChip,
}: {
  event: ActivityEvent;
  showLeadChip?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = normalizeMetadata(event.metadata);
  const detailLines = meta ? metadataDetailLines(meta) : [];
  const scoredCount =
    (event.action === 'PL_SCORE_RUN_DONE' ||
      event.action === 'BL_SCORE_RUN_DONE') &&
    meta &&
    meta.scored != null &&
    String(meta.scored).trim() !== ''
      ? Number(meta.scored)
      : null;
  const scoredLabel =
    scoredCount != null && Number.isFinite(scoredCount)
      ? `${scoredCount} lender${scoredCount === 1 ? '' : 's'} scored`
      : null;

  return (
    <div style={styles.eventRow}>
      <span style={styles.eventDot} />
      <div style={styles.eventMeta}>
        <span style={styles.eventTime}>{formatTime(event.createdAt)}</span>
        {scoredLabel && (
          <span style={styles.metaStat}>{scoredLabel}</span>
        )}
        <span
          style={{
            ...styles.severityPill,
            ...severityStyle(event.severity),
          }}
        >
          {event.severity || 'info'}
        </span>
        {event.category && (
          <span
            style={{
              ...styles.badge,
              ...categoryBadgeStyle(event.category),
            }}
          >
            {categoryLabel(event.category)}
          </span>
        )}
        {showLeadChip && event.leadId != null && (
          <span style={styles.leadIdPill}>
            #{event.leadId}
            {event.leadName ? ` · ${event.leadName}` : ''}
          </span>
        )}
        <span style={styles.eventAction}>{event.action}</span>
      </div>
      <div style={styles.eventDesc}>{event.description}</div>
      {event.correlationId && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Run {String(event.correlationId).slice(0, 8)}
        </div>
      )}
      {detailLines.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button type="button" style={styles.linkBtn} onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide details' : 'Show details'}
          </button>
        </div>
      )}
      {open && meta && Object.keys(meta).length > 0 && (
        <pre style={styles.detailJsonBox}>
          {JSON.stringify(meta, null, 2)}
        </pre>
      )}
    </div>
  );
}

function EmailRunCard({ group }: { group: EmailRunGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [openDetailsId, setOpenDetailsId] = useState<number | null>(null);

  return (
    <div style={{ ...styles.card, ...(expanded ? styles.cardOpen : {}) }}>
      <div
        style={styles.cardHeader}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <span style={styles.chevron}>{expanded ? '▾' : '▸'}</span>
          <div>
            <div style={styles.leadTitle}>
              {group.leadId != null ? (
                <span style={styles.leadIdPill}>#{group.leadId}</span>
              ) : (
                <span style={styles.leadIdPill}>No lead</span>
              )}
              <span>{group.leadName || 'Unknown lead'}</span>
            </div>
            <div style={styles.metaRow}>
              <span>{formatTime(group.latestAt)}</span>
              <span>
                {group.persons.length} recipient
                {group.persons.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 16px' }}>
          {group.persons.map((person) => {
            const detailLines = metadataDetailLines(
              normalizeMetadata(person.event.metadata) || {}
            );
            const open = openDetailsId === person.eventId;
            const reason = person.reasonShort;
            return (
              <div
                key={person.eventId}
                style={{
                  padding: '8px 10px',
                  marginBottom: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#334155',
                }}
              >
                <div>
                  <strong>{person.roleLabel}</strong>
                  {' — '}
                  {person.recipient}
                  {' — '}
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        person.statusLabel === 'Failed'
                          ? '#b91c1c'
                          : person.statusLabel === 'Skipped'
                            ? '#b45309'
                            : '#15803d',
                    }}
                  >
                    {person.statusLabel}
                  </span>
                  {reason ? ` — ${reason}` : ''}
                </div>
                {detailLines.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      style={styles.linkBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDetailsId(open ? null : person.eventId);
                      }}
                    >
                      {open ? 'Hide details' : 'Show details'}
                    </button>
                  </div>
                )}
                {open && detailLines.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 11,
                      lineHeight: 1.55,
                      background: '#0f172a',
                      color: '#e2e8f0',
                      padding: 10,
                      borderRadius: 8,
                      overflowX: 'auto',
                    }}
                  >
                    {detailLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LenderPanelMode = 'eligibility' | 'scoring';

function latestLenderEligibilityEvent(bucket: LenderBucket): {
  meta: Record<string, unknown>;
  createdAt: string;
} | null {
  let latest: { meta: Record<string, unknown>; createdAt: string } | null = null;
  for (const event of bucket.events) {
    if (
      event.action !== 'PL_ELIGIBILITY_LENDER' &&
      event.action !== 'BL_ELIGIBILITY_LENDER'
    ) {
      continue;
    }
    const meta = normalizeEventMetadata(event.metadata);
    if (
      !latest ||
      new Date(event.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = { meta, createdAt: event.createdAt };
    }
  }
  return latest;
}

function latestLenderScoreEvent(bucket: LenderBucket): ActivityEvent | null {
  let latest: ActivityEvent | null = null;
  for (const event of bucket.events) {
    if (event.action !== 'PL_SCORE_LENDER' && event.action !== 'BL_SCORE_LENDER') {
      continue;
    }
    if (
      !latest ||
      new Date(event.createdAt).getTime() > new Date(latest.createdAt).getTime()
    ) {
      latest = event;
    }
  }
  return latest;
}

function normalizeRuleRow(raw: unknown): Record<string, unknown> {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    ruleId: c.ruleId ?? c.criterionId ?? c.criterionCode ?? null,
    ruleName: c.ruleName ?? c.criterionId ?? c.criterionCode ?? c.ruleId ?? null,
    result: c.result ?? null,
    errorCode: c.errorCode ?? null,
    applicantValue: c.applicantValue ?? c.applicant ?? null,
    threshold: c.threshold ?? null,
    formula: c.formula ?? null,
    reason: c.reason ?? null,
    ...(c.points != null ? { points: c.points } : {}),
    ...(c.weight != null ? { weight: c.weight } : {}),
  };
}

function isPassFailSkip(result: unknown): boolean {
  const r = String(result || '').toUpperCase();
  return r === 'PASS' || r === 'FAIL' || r === 'SKIP';
}

function isScoringRuleResult(result: unknown): boolean {
  const r = String(result || '').toUpperCase();
  return r === 'PASS' || r === 'FAIL' || r === 'SKIP' || r === 'SCORED';
}

/** Latest eligibility run rules for this lender only (no rematch mix / rule spam). */
function buildLenderEligibilityDetailJson(bucket: LenderBucket): unknown {
  const latest = latestLenderEligibilityEvent(bucket);
  if (!latest) {
    return {
      lenderCode: bucket.lenderCode,
      lenderName: bucket.lenderName,
      result: null,
      failedRuleId: null,
      rules: [],
      note: 'No eligibility run logged for this lender yet',
    };
  }

  const meta = latest.meta;
  const conditions = Array.isArray(meta.conditions) ? meta.conditions : [];
  const result =
    meta.result != null && String(meta.result).trim()
      ? String(meta.result).toUpperCase()
      : null;

  const failFromConditions = conditions.find((c) => {
    const r = String(
      (c && typeof c === 'object'
        ? (c as Record<string, unknown>).result
        : '') || ''
    ).toUpperCase();
    return r === 'FAIL';
  }) as Record<string, unknown> | undefined;
  const failedRuleId =
    (failFromConditions?.ruleId != null &&
      String(failFromConditions.ruleId).trim()) ||
    (Array.isArray(meta.failed) && meta.failed.length
      ? String(meta.failed[0])
      : null) ||
    null;

  if (conditions.length === 0) {
    return {
      lenderCode: bucket.lenderCode,
      lenderName: bucket.lenderName,
      result,
      failedRuleId,
      passed: meta.passed ?? null,
      failed: meta.failed ?? null,
      skipped: meta.skipped ?? null,
      errorCodes: meta.errorCodes ?? null,
      rules: [],
      note: 'Re-run AI Match to capture full rule details',
    };
  }

  return {
    lenderCode: bucket.lenderCode,
    lenderName: bucket.lenderName,
    result,
    failedRuleId,
    rules: conditions
      .filter((c) =>
        isPassFailSkip(
          c && typeof c === 'object'
            ? (c as Record<string, unknown>).result
            : ''
        )
      )
      .map(normalizeRuleRow),
  };
}

/** Latest scoring run criteria for this lender only. */
function buildLenderScoringDetailJson(bucket: LenderBucket): unknown {
  const latest = latestLenderScoreEvent(bucket);
  if (!latest) {
    return {
      lenderCode: bucket.lenderCode,
      lenderName: bucket.lenderName,
      result: null,
      totalScore: null,
      failedRuleId: null,
      rules: [],
      note: 'No scoring run logged for this lender yet',
    };
  }

  const meta = normalizeEventMetadata(latest.metadata);
  const corr =
    (latest.correlationId && String(latest.correlationId).trim()) ||
    (meta.runId != null && String(meta.runId).trim()) ||
    '';

  const criterionActions = new Set([
    'PL_SCORE_CRITERION',
    'PL_SCORE_CRITERION_SKIP',
    'BL_SCORE_CRITERION',
    'BL_SCORE_CRITERION_SKIP',
  ]);

  const rules = bucket.events
    .filter((event) => {
      if (!criterionActions.has(event.action)) return false;
      if (!corr) return true;
      const em = normalizeEventMetadata(event.metadata);
      const eCorr =
        (event.correlationId && String(event.correlationId).trim()) ||
        (em.runId != null && String(em.runId).trim()) ||
        '';
      return !eCorr || eCorr === corr;
    })
    .map((event) => {
      const em = normalizeEventMetadata(event.metadata);
      return normalizeRuleRow(em);
    })
    .filter((row) => isScoringRuleResult(row.result));

  const failRow = rules.find(
    (r) => String(r.result || '').toUpperCase() === 'FAIL'
  );
  const failedRuleId =
    (failRow?.ruleId != null && String(failRow.ruleId).trim()) || null;

  const result =
    meta.result != null && String(meta.result).trim()
      ? String(meta.result).toUpperCase()
      : 'SCORED';

  return {
    lenderCode: bucket.lenderCode,
    lenderName: bucket.lenderName,
    result,
    totalScore: meta.totalScore ?? meta.score ?? null,
    failedRuleId,
    rules,
  };
}

function buildLenderDetailJson(
  bucket: LenderBucket,
  mode: LenderPanelMode
): unknown {
  return mode === 'scoring'
    ? buildLenderScoringDetailJson(bucket)
    : buildLenderEligibilityDetailJson(bucket);
}

function resolveLenderEligibilitySummary(bucket: LenderBucket): {
  status: 'PASS' | 'FAIL' | 'SKIP' | null;
  reason: string | null;
  scoreLabel?: string | null;
} {
  const latest = latestLenderEligibilityEvent(bucket);
  if (!latest) return { status: null, reason: null };

  const conditions = Array.isArray(latest.meta.conditions)
    ? (latest.meta.conditions as Record<string, unknown>[])
    : [];

  const failCond = conditions.find(
    (c) => String(c?.result || '').toUpperCase() === 'FAIL'
  );
  if (failCond) {
    const reason =
      String(failCond.reason || '').trim() ||
      String(failCond.errorCode || '').trim() ||
      String(failCond.ruleName || failCond.ruleId || '').trim() ||
      null;
    return { status: 'FAIL', reason };
  }

  const passCond = conditions.find(
    (c) => String(c?.result || '').toUpperCase() === 'PASS'
  );
  if (passCond) return { status: 'PASS', reason: null };

  const skipCond = conditions.find(
    (c) => String(c?.result || '').toUpperCase() === 'SKIP'
  );
  if (skipCond) {
    const reason =
      String(skipCond.reason || '').trim() ||
      String(skipCond.ruleName || skipCond.ruleId || '').trim() ||
      null;
    return { status: 'SKIP', reason };
  }

  const overall = String(latest.meta.result || '').toUpperCase();
  if (overall === 'PASS' || overall === 'FAIL' || overall === 'SKIP') {
    return {
      status: overall as 'PASS' | 'FAIL' | 'SKIP',
      reason:
        overall === 'PASS'
          ? null
          : String(latest.meta.reason || '').trim() ||
            (Array.isArray(latest.meta.errorCodes) &&
            latest.meta.errorCodes.length
              ? String(latest.meta.errorCodes[0])
              : null),
    };
  }

  return { status: null, reason: null };
}

function resolveLenderScoringSummary(bucket: LenderBucket): {
  status: 'PASS' | 'FAIL' | 'SKIP' | 'SCORED' | null;
  reason: string | null;
  scoreLabel?: string | null;
} {
  const latest = latestLenderScoreEvent(bucket);
  if (!latest) return { status: null, reason: null };
  const meta = normalizeEventMetadata(latest.metadata);
  const total = meta.totalScore ?? meta.score;
  const scoreLabel =
    total != null && String(total).trim() !== ''
      ? `Score ${total}`
      : null;

  const detail = buildLenderScoringDetailJson(bucket) as {
    result?: string | null;
    failedRuleId?: string | null;
    rules?: Record<string, unknown>[];
  };
  const failRow = (detail.rules || []).find(
    (r) => String(r.result || '').toUpperCase() === 'FAIL'
  );
  if (failRow) {
    return {
      status: 'FAIL',
      reason:
        String(failRow.reason || '').trim() ||
        String(failRow.errorCode || failRow.ruleId || '').trim() ||
        null,
      scoreLabel,
    };
  }
  const skipOnly =
    (detail.rules || []).length > 0 &&
    (detail.rules || []).every(
      (r) => String(r.result || '').toUpperCase() === 'SKIP'
    );
  if (skipOnly) {
    const skipRow = (detail.rules || [])[0];
    return {
      status: 'SKIP',
      reason:
        String(skipRow?.reason || '').trim() ||
        String(skipRow?.ruleId || '').trim() ||
        null,
      scoreLabel,
    };
  }

  const overall = String(detail.result || meta.result || 'SCORED').toUpperCase();
  return {
    status: 'SCORED',
    reason: null,
    scoreLabel:
      scoreLabel ||
      (overall && overall !== 'SCORED' ? overall : null),
  };
}

function lenderStatusPillStyle(status: 'PASS' | 'FAIL' | 'SKIP' | 'SCORED') {
  if (status === 'PASS' || status === 'SCORED') return styles.lenderStatusPass;
  if (status === 'FAIL') return styles.lenderStatusFail;
  return styles.lenderStatusSkip;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);
}

/** Compact eligibility counts + failed rule ids for LenderCard. */
function buildEligibilitySummaryLines(bucket: LenderBucket): string[] {
  const latest = latestLenderEligibilityEvent(bucket);
  if (!latest) return [];

  const meta = latest.meta;
  let passed = asStringList(meta.passed);
  let failed = asStringList(meta.failed);
  let skipped = asStringList(meta.skipped);

  if (
    passed.length === 0 &&
    failed.length === 0 &&
    skipped.length === 0 &&
    Array.isArray(meta.conditions)
  ) {
    for (const raw of meta.conditions) {
      const c = (raw && typeof raw === 'object' ? raw : {}) as Record<
        string,
        unknown
      >;
      const id = String(c.ruleId || c.ruleName || '').trim();
      if (!id) continue;
      const r = String(c.result || '').toUpperCase();
      if (r === 'PASS') passed.push(id);
      else if (r === 'FAIL') failed.push(id);
      else if (r === 'SKIP') skipped.push(id);
    }
  }

  const lines = [
    `Passed ${passed.length} · Failed ${failed.length} · Skipped ${skipped.length}`,
  ];
  if (failed.length > 0) {
    lines.push(`Failed: ${failed.join(', ')}`);
  }
  return lines;
}

/** Compact scoring criterionScores + skipped for LenderCard. */
function buildScoringSummaryLines(bucket: LenderBucket): string[] {
  const latest = latestLenderScoreEvent(bucket);
  if (!latest) return [];
  const meta = normalizeEventMetadata(latest.metadata);
  const summary =
    meta.summary && typeof meta.summary === 'object'
      ? (meta.summary as Record<string, unknown>)
      : null;

  let criterionScores: Record<string, number> = {};
  let scoringSkipped: string[] = [];

  if (summary) {
    const rawScores = summary.criterionScores;
    if (rawScores && typeof rawScores === 'object' && !Array.isArray(rawScores)) {
      for (const [k, v] of Object.entries(rawScores as Record<string, unknown>)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (k && Number.isFinite(n)) criterionScores[k] = n;
      }
    }
    scoringSkipped = asStringList(summary.scoringSkipped);
  }

  if (Object.keys(criterionScores).length === 0) {
    const detail = buildLenderScoringDetailJson(bucket) as {
      rules?: Record<string, unknown>[];
    };
    for (const row of detail.rules || []) {
      const id = String(row.ruleId || row.ruleName || '').trim();
      if (!id) continue;
      if (String(row.result || '').toUpperCase() === 'SKIP') {
        if (!scoringSkipped.includes(id)) scoringSkipped.push(id);
        continue;
      }
      const pts = row.points != null ? Number(row.points) : NaN;
      if (Number.isFinite(pts)) criterionScores[id] = pts;
    }
  }

  const lines: string[] = [];
  const keys = Object.keys(criterionScores).sort((a, b) => a.localeCompare(b));
  if (keys.length > 0) {
    lines.push(
      keys.map((k) => `${k}: ${criterionScores[k]}`).join(' · ')
    );
  }
  if (scoringSkipped.length > 0) {
    lines.push(`Skipped: ${scoringSkipped.join(', ')}`);
  }
  return lines;
}

function LenderCard({
  bucket,
  mode,
}: {
  bucket: LenderBucket;
  mode: LenderPanelMode;
}) {
  const [open, setOpen] = useState(false);
  const jsonText = JSON.stringify(buildLenderDetailJson(bucket, mode), null, 2);
  const summary =
    mode === 'scoring'
      ? resolveLenderScoringSummary(bucket)
      : resolveLenderEligibilitySummary(bucket);
  const summaryLines =
    mode === 'scoring'
      ? buildScoringSummaryLines(bucket)
      : buildEligibilitySummaryLines(bucket);

  return (
    <div style={styles.lenderCard}>
      <div style={styles.lenderCardName}>{bucket.lenderName}</div>
      {(summary.status || summary.scoreLabel) && (
        <div style={styles.lenderStatusRow}>
          {summary.status && (
            <span
              style={{
                ...styles.lenderStatusPill,
                ...lenderStatusPillStyle(summary.status),
              }}
            >
              {summary.status}
            </span>
          )}
          {summary.scoreLabel && (
            <span style={styles.lenderStatusReason}>
              {summary.status ? ' · ' : ''}
              {summary.scoreLabel}
            </span>
          )}
          {(summary.status === 'FAIL' || summary.status === 'SKIP') &&
            summary.reason && (
              <div style={styles.lenderStatusReason}>
                Reason: {summary.reason}
              </div>
            )}
        </div>
      )}
      {summaryLines.length > 0 && (
        <div style={styles.lenderSummary}>
          <div style={styles.lenderSummaryTitle}>
            {mode === 'scoring' ? 'Scoring summary' : 'Eligibility summary'}
          </div>
          {summaryLines.map((line) => (
            <div key={line} style={styles.lenderSummaryLine}>
              {line}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          style={styles.linkBtn}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide details' : 'Show details'}
        </button>
      </div>
      {open && (
        <pre style={styles.detailJsonBox}>{jsonText}</pre>
      )}
    </div>
  );
}

function LenderListPanel({
  buckets,
  mode,
}: {
  buckets: LenderBucket[];
  mode: LenderPanelMode;
}) {
  return (
    <div style={styles.lenderList}>
      <div style={styles.lenderChipLabel}>Lenders ({buckets.length})</div>
      {buckets.length === 0 ? (
        <div style={styles.empty}>
          {mode === 'scoring'
            ? 'No lenders scored for this lead yet.'
            : 'No active criteria lenders for this lead’s product.'}
        </div>
      ) : (
        buckets.map((bucket) => (
          <LenderCard
            key={bucket.lenderCode}
            bucket={bucket}
            mode={mode}
          />
        ))
      )}
    </div>
  );
}

export const LeadActivityTimeline = () => {
  const {
    viewMode,
    setViewMode,
    leads,
    loading,
    search,
    setSearch,
    reload,
    expandedLeadId,
    toggleLead,
    activeCategory,
    setActiveCategory,
    events,
    eventsLoading,
    activeLenderCodes,
    domainEvents,
    domainLoading,
    emailActionFilter,
    setEmailActionFilter,
    leadProductFilter,
    setLeadProductFilter,
    authRoleFilter,
    setAuthRoleFilter,
    error,
  } = useLeadActivityTimeline();

  const isDomainView =
    viewMode === 'email' ||
    viewMode === 'user-registration' ||
    viewMode === 'system';

  const emailGroups =
    viewMode === 'email' ? groupEmailEvents(domainEvents, emailActionFilter) : [];

  const filteredLeads =
    leadProductFilter === 'ALL'
      ? leads
      : leads.filter((lead) => lead.loanType === leadProductFilter);

  const filteredDomainEvents =
    viewMode === 'user-registration'
      ? domainEvents.filter((event) =>
          eventMatchesAuthRole(event, authRoleFilter)
        )
      : domainEvents;

  return (
    <div style={styles.root} id="lead-activity-timeline-root-inner">
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Activity Logs</h1>
          <p style={styles.subtitle}>
            Project-wide audit trail by domain: Lead, Email, Users & Auth, System.
          </p>
        </div>
        <div style={styles.headerActions}>
          <a
            href="/admin/content-manager/collection-types/api::system-events.activity-log?sort=createdAt:DESC&raw=1"
            style={{ ...styles.ghostBtn, textDecoration: 'none' }}
          >
            Raw dump
          </a>
        </div>
      </div>

      <div style={styles.viewTabs}>
        {DOMAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              ...styles.viewTab,
              ...(viewMode === tab.id ? styles.viewTabActive : {}),
            }}
            onClick={() => setViewMode(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === 'lead' ? (
        <div style={styles.toolbar}>
          <input
            style={styles.search}
            placeholder="Search by lead ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') reload();
            }}
          />
          <button type="button" onClick={reload} style={styles.primaryBtn}>
            Search
          </button>
        </div>
      ) : (
        <div style={styles.toolbar}>
          <input
            style={styles.search}
            placeholder="Search action, description, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') reload();
            }}
          />
          <button type="button" onClick={reload} style={styles.primaryBtn}>
            Search
          </button>
        </div>
      )}

      {viewMode === 'email' && (
        <div style={{ ...styles.tabs, marginBottom: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {EMAIL_ACTION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                ...styles.tab,
                ...(emailActionFilter === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setEmailActionFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'lead' && (
        <div style={{ ...styles.tabs, marginBottom: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {LEAD_PRODUCT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                ...styles.tab,
                ...(leadProductFilter === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setLeadProductFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'user-registration' && (
        <div style={{ ...styles.tabs, marginBottom: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {AUTH_ROLE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                ...styles.tab,
                ...(authRoleFilter === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setAuthRoleFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {viewMode === 'email' ? (
        domainLoading ? (
          <div style={styles.emptyCard}>Loading events…</div>
        ) : emailGroups.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              No matching email events
            </div>
            <div>
              Loan application submit emails (Super Admin, Advisor, Applicant) appear here as
              Lead-grouped runs.
            </div>
          </div>
        ) : (
          <div>
            {emailGroups.map((group) => (
              <EmailRunCard key={group.key} group={group} />
            ))}
          </div>
        )
      ) : isDomainView ? (
        domainLoading ? (
          <div style={styles.emptyCard}>Loading events…</div>
        ) : domainEvents.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              No matching events
            </div>
            <div>
              {viewMode === 'user-registration'
                ? 'Login, registration, approvals, and admin/staff/banker account creates appear here.'
                : 'Maintenance and log cleanup events appear here.'}
            </div>
          </div>
        ) : filteredDomainEvents.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              No matching events
            </div>
            <div>No events for this role filter.</div>
          </div>
        ) : (
          <div style={styles.allEventsPanel}>
            <div style={{ ...styles.eventList, marginLeft: 18, maxHeight: 'none' }}>
              {filteredDomainEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        )
      ) : loading ? (
        <div style={styles.emptyCard}>Loading activity…</div>
      ) : filteredLeads.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            {leads.length === 0 ? 'No lead activity yet' : 'No matching leads'}
          </div>
          <div>
            {leads.length === 0
              ? 'Lead-tied events appear here after lead create, loan submit, or AI Match. Use Email, Users & Auth, or System for mail and account/ops logs.'
              : 'No leads for this PL/BL filter.'}
          </div>
        </div>
      ) : (
        filteredLeads.map((lead) => {
          const open = expandedLeadId === lead.leadId;
          const hasError =
            lead.latestSeverity === 'error' || lead.latestSeverity === 'critical';
          const leadEventCount = Number(lead.eventCount || 0);
          const leadCategoryBadges = Object.entries(lead.categoryCounts || {})
            .filter(([cat]) => cat !== 'EMAIL')
            .sort(([a], [b]) => {
              const ia = LEAD_JOURNEY_CATEGORY_ORDER.indexOf(a);
              const ib = LEAD_JOURNEY_CATEGORY_ORDER.indexOf(b);
              const ra = ia === -1 ? LEAD_JOURNEY_CATEGORY_ORDER.length : ia;
              const rb = ib === -1 ? LEAD_JOURNEY_CATEGORY_ORDER.length : ib;
              return ra - rb || a.localeCompare(b);
            });
          const filteredEvents = events
            .filter((event) => event.category !== 'EMAIL')
            .slice()
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          const showLendersPanel =
            activeCategory === 'LENDER_ELIGIBILITY' ||
            activeCategory === 'LENDER_SCORING';
          const lenderPanelMode: LenderPanelMode =
            activeCategory === 'LENDER_SCORING' ? 'scoring' : 'eligibility';
          const grouped = groupLenderPipelineEvents(
            filteredEvents,
            new Set(activeLenderCodes)
          );
          const timelineEvents = grouped.timeline;
          const lenderBuckets = showLendersPanel
            ? lenderPanelMode === 'scoring'
              ? buildScoredLenderBuckets(
                  activeLenderCodes,
                  grouped.lenderBuckets
                )
              : buildActiveLenderBuckets(
                  activeLenderCodes,
                  grouped.lenderBuckets
                )
            : [];
          return (
            <div
              key={lead.leadId}
              style={{
                ...styles.card,
                ...(open ? styles.cardOpen : {}),
              }}
            >
              <div
                style={styles.cardHeader}
                onClick={() => toggleLead(lead.leadId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleLead(lead.leadId);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={styles.chevron}>{open ? '▾' : '▸'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.leadTitle}>
                      <span style={styles.leadIdPill}>#{lead.leadId}</span>
                      <span>{lead.leadName || 'Unknown lead'}</span>
                    </div>
                    <div style={styles.metaRow}>
                      <span style={styles.metaStat}>
                        Last {formatTime(lead.lastActivityAt)}
                      </span>
                      <span style={styles.metaStat}>{leadEventCount} events</span>
                      <span
                        style={{
                          ...styles.severityPill,
                          ...severityStyle(hasError ? lead.latestSeverity : 'info'),
                        }}
                      >
                        {hasError ? lead.latestSeverity : 'ok'}
                      </span>
                    </div>
                    <div style={styles.badges}>
                      {leadCategoryBadges.map(([cat, count]) => (
                        <span
                          key={cat}
                          style={{
                            ...styles.badge,
                            ...categoryBadgeStyle(cat),
                          }}
                        >
                          {categoryLabel(cat)} · {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {open && (
                <>
                  <div style={styles.tabs}>
                    {CATEGORY_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        style={{
                          ...styles.tab,
                          ...(activeCategory === tab.id ? styles.tabActive : {}),
                        }}
                        onClick={() => setActiveCategory(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div style={styles.eventList}>
                    {eventsLoading ? (
                      <div style={styles.empty}>Loading events…</div>
                    ) : (
                      <>
                        {timelineEvents.length === 0 && !showLendersPanel ? (
                          <div style={styles.empty}>No events in this category</div>
                        ) : (
                          timelineEvents.map((event) => (
                            <EventRow key={event.id} event={event} />
                          ))
                        )}
                        {showLendersPanel && (
                          <LenderListPanel
                            buckets={lenderBuckets}
                            mode={lenderPanelMode}
                          />
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
