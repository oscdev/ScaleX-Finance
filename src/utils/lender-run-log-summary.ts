/** Human-readable run-end summaries for eligibility + scoring file logs (PL and BL). */

export interface StepFailureSummaryLender {
  lenderCode: string;
  eligible: boolean;
  conditions: Array<{
    step: number;
    ruleId: string;
    ruleName?: string;
    result: string;
  }>;
}

export interface ScoringLenderSummaryInput {
  lenderCode: string;
  lenderName?: string;
  totalScore: number;
  rank?: number | null;
  displayed?: boolean;
  summary: {
    criterionScores: Partial<Record<string, number>>;
    scoringSkipped?: string[];
  };
}

const CRITERION_LABELS: Record<string, string> = {
  CIBIL_SCORE: 'CIBIL score',
  FOIR_CHECK: 'FOIR',
  DPD_LAST_3M: 'DPD last 3 months',
  DPD_LAST_12M: 'DPD last 12 months',
  CC_UTILIZATION: 'Credit card utilization',
  ACTIVE_UNSECURED: 'Active unsecured loans',
  ENQUIRIES_3M: 'Enquiries (3 months)',
  MONTHLY_INCOME: 'Monthly income',
  JOB_EXPERIENCE: 'Job experience',
  ROI_COMPETITIVENESS: 'ROI competitiveness',
  MAX_LOAN_ADEQUACY: 'Max loan adequacy',
  ANNUAL_TURNOVER: 'Annual turnover',
  BUSINESS_VINTAGE: 'Business vintage',
  ITR_DOCUMENTATION: 'ITR documentation',
  BUSINESS_REGISTRATION_PROOF: 'Business registration proof',
};

function lenderLabel(code: string, name?: string): string {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== code) return `${trimmed} (${code})`;
  return code;
}

function criterionLabel(id: string): string {
  return CRITERION_LABELS[id] ?? id.replace(/_/g, ' ').toLowerCase();
}

export interface LenderCriterionSummaryInput {
  lenderCode: string;
  lenderName?: string;
  summary: {
    criterionScores: Partial<Record<string, number>>;
    scoringSkipped?: string[];
    totalScore?: number;
  };
}

/** Human-readable per-criterion lines for one lender (used after detailed lender block). */
export function formatLenderCriterionSummaryLines(
  lender: LenderCriterionSummaryInput
): string[] {
  const label = lenderLabel(lender.lenderCode, lender.lenderName);
  const lines = [`SUMMARY — ${label}:`];

  const total =
    lender.summary.totalScore ??
    Object.values(lender.summary.criterionScores).reduce(
      (sum, pts) => sum + (pts ?? 0),
      0
    );
  lines.push(`  Total score: ${total}`);

  for (const [id, pts] of Object.entries(lender.summary.criterionScores)) {
    if (pts == null) continue;
    lines.push(`  ${criterionLabel(id)}: ${pts} pt`);
  }

  if (lender.summary.scoringSkipped?.length) {
    lines.push(
      `  Skipped: ${lender.summary.scoringSkipped.map(criterionLabel).join(', ')}`
    );
  }

  return lines;
}

/** Grouped-by-step summary (eligibility logs). */
export function buildStepFailureSummary(
  lenders: StepFailureSummaryLender[],
  resolveRuleName?: (ruleId: string) => string | undefined
): string {
  const byRule = new Map<
    string,
    { step: number; ruleId: string; ruleName: string; lenders: string[] }
  >();

  for (const lender of lenders) {
    if (lender.eligible) continue;
    const fail = lender.conditions.find((c) => c.result === 'FAIL');
    if (!fail) continue;
    const ruleName =
      fail.ruleName?.trim() || resolveRuleName?.(fail.ruleId) || fail.ruleId;
    const entry = byRule.get(fail.ruleId) ?? {
      step: fail.step,
      ruleId: fail.ruleId,
      ruleName,
      lenders: [],
    };
    entry.lenders.push(lender.lenderCode);
    byRule.set(fail.ruleId, entry);
  }

  const lines = ['STEP_SUMMARY (failed lenders by step):'];
  const sorted = [...byRule.values()].sort(
    (a, b) => a.step - b.step || a.ruleId.localeCompare(b.ruleId)
  );
  if (!sorted.length) {
    lines.push('  (no failures — all lenders passed)');
    return lines.join('\n');
  }

  for (const { step, ruleId, ruleName, lenders: failed } of sorted) {
    lines.push(
      `  step ${step} | ${ruleId} (${ruleName}) | ${failed.length} lender(s): ${failed.join(', ')}`
    );
  }

  const eligible = lenders.filter((l) => l.eligible).map((l) => l.lenderCode);
  if (eligible.length) {
    lines.push(`  PASSED all steps: ${eligible.join(', ')}`);
  }

  return lines.join('\n');
}

export function formatScoringLenderLine(
  lender: ScoringLenderSummaryInput,
  minDisplayScore: number
): string {
  const label = lenderLabel(lender.lenderCode, lender.lenderName);
  const rankPart = lender.rank != null ? `, rank #${lender.rank}` : '';
  const status =
    lender.displayed === true
      ? `shown on AI Match (score ≥ ${minDisplayScore})`
      : lender.displayed === false
        ? `below display threshold (< ${minDisplayScore})`
        : 'scored';
  return `${label}: total score ${lender.totalScore}${rankPart} — ${status}`;
}

export function buildScoringLenderSummary(
  lenders: ScoringLenderSummaryInput[],
  minDisplayScore: number
): string {
  const lines = ['LENDER_SUMMARY (this run):'];
  if (!lenders.length) {
    lines.push('  (no lenders scored)');
    return lines.join('\n');
  }

  const sorted = [...lenders].sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return b.totalScore - a.totalScore || a.lenderCode.localeCompare(b.lenderCode);
  });

  for (const lender of sorted) {
    lines.push(`  ${formatScoringLenderLine(lender, minDisplayScore)}`);
    lines.push('');
  }

  if (lines[lines.length - 1] === '') lines.pop();

  const displayed = lenders.filter((l) => l.displayed).length;
  lines.push(`  Totals: ${lenders.length} scored, ${displayed} shown on AI Match`);
  return lines.join('\n');
}
