import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { ConditionResult, LenderEvalResult } from './types';
import { getRuleCatalog } from './rule-catalog';

const LOG_DIR = path.join(process.cwd(), 'logs', 'pl-eligibility');

export type PlLogEvent =
  | 'RUN_START'
  | 'PROFILE_READY'
  | 'RUN_BLOCKED'
  | 'CONNECTION_FAILURE'
  | 'LENDER_START'
  | 'STEP'
  | 'LENDER_EXIT'
  | 'LENDER_COMPLETE'
  | 'RUN_COMPLETE'
  | 'RUN_ERROR';

interface StepRecord {
  step: number;
  ruleId: string;
  ruleName: string;
  result: string;
  formula: string;
  applicant: unknown;
  threshold: unknown;
  src_applicant: string[];
  src_threshold: string[];
  errorCode?: string | null;
  reason?: string | null;
  branchUsed?: string;
  matchMode?: string;
}

interface LenderBuffer {
  lenderCode: string;
  lenderName: string;
  steps: StepRecord[];
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logFilePath(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return path.join(LOG_DIR, `${yyyy}-${mm}-${dd}.log`);
}

export function newRunId(): string {
  return randomUUID();
}

function appendText(text: string): string {
  ensureLogDir();
  const file = logFilePath();
  fs.appendFileSync(file, `${text}\n`, 'utf8');
  return file;
}

function fmtCols(fields: { table: string; column: string }[] | undefined): string[] {
  if (!fields?.length) return [];
  return fields.map((f) => `${f.table}.${f.column}`);
}

function shapeStep(condition: ConditionResult): StepRecord {
  const catalog = getRuleCatalog(condition.ruleId);
  const step: StepRecord = {
    step: condition.step,
    ruleId: condition.ruleId,
    ruleName: condition.ruleName ?? catalog?.ruleName ?? condition.ruleId,
    result: condition.result,
    formula: condition.formula ?? catalog?.formula ?? '',
    applicant: condition.applicantValue ?? null,
    threshold: condition.threshold ?? null,
    src_applicant: fmtCols(catalog?.applicantSources),
    src_threshold: fmtCols(catalog?.thresholdSources),
  };
  if (condition.errorCode) step.errorCode = condition.errorCode;
  if (condition.reason) step.reason = condition.reason;
  if (condition.branchUsed) step.branchUsed = condition.branchUsed;
  if (condition.matchMode) step.matchMode = condition.matchMode;
  return step;
}

function flushLenderBlock(
  buffer: LenderBuffer,
  outcome: {
    eligible: boolean;
    failedAt?: string | null;
    failedStep?: number | null;
    passed: number;
    failed: number;
    skipped: number;
    notRun: number;
    errorCode?: string | null;
  }
) {
  const body = {
    lenderName: buffer.lenderName,
    eligible: outcome.eligible,
    ...(outcome.failedAt ? { failedAt: outcome.failedAt, failedStep: outcome.failedStep } : {}),
    ...(outcome.errorCode ? { errorCode: outcome.errorCode } : {}),
    passed: outcome.passed,
    failed: outcome.failed,
    skipped: outcome.skipped,
    notRun: outcome.notRun,
    steps: buffer.steps,
  };
  appendText(`lender = ${buffer.lenderCode} ${JSON.stringify(body, null, 2)}`);
  appendText('');
}

function buildStepFailureSummary(lenders: LenderEvalResult[]): string {
  const byRule = new Map<
    string,
    { step: number; ruleId: string; ruleName: string; lenders: string[] }
  >();

  for (const l of lenders) {
    if (l.eligible) continue;
    const fail = l.conditions.find((c) => c.result === 'FAIL');
    if (!fail) continue;
    const catalog = getRuleCatalog(fail.ruleId);
    const ruleName = fail.ruleName ?? catalog?.ruleName ?? fail.ruleId;
    const entry = byRule.get(fail.ruleId) ?? {
      step: fail.step,
      ruleId: fail.ruleId,
      ruleName,
      lenders: [],
    };
    entry.lenders.push(l.lenderCode);
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

export interface EligibilityRunLogger {
  runId: string;
  leadId: number;
  log(event: PlLogEvent, payload?: Record<string, unknown>): string;
  beginLender(lenderCode: string, lenderName: string): void;
  logStep(lenderCode: string, _lenderName: string, condition: ConditionResult): string;
  logLenderExit(
    lenderCode: string,
    lenderName: string,
    failedCondition: ConditionResult,
    summary: { passed: string[]; failed: string[]; skipped: string[]; notEvaluated: string[] }
  ): string;
  logLenderComplete(
    lenderCode: string,
    lenderName: string,
    summary: { passed: string[]; failed: string[]; skipped: string[]; notEvaluated: string[] }
  ): string;
  logRunComplete(payload: Record<string, unknown>): string;
  logRunError(message: string): string;
}

export function createEligibilityRunLogger(runId: string, leadId: number): EligibilityRunLogger {
  let currentLender: LenderBuffer | null = null;
  let runSource = 'matched-lenders';

  const writeRunHeader = (profile: Record<string, unknown>) => {
    const lines = [
      `leadId: ${leadId}`,
      `runId: ${runId.slice(0, 8)}`,
      `source: ${runSource}`,
      `profile: ${JSON.stringify({
        pin: profile.applicantPin ?? null,
        amount: profile.requestedAmount ?? null,
        bureau: profile.hasBureau ?? false,
        cibil: profile.cibilScore ?? null,
        ftb: profile.isFirstTimeBorrower ?? false,
      })}`,
      '---',
    ];
    appendText(lines.join('\n'));
  };

  return {
    runId,
    leadId,

    log(event, payload = {}) {
      switch (event) {
        case 'RUN_START':
          runSource = String(payload.source ?? 'matched-lenders');
          return '';
        case 'PROFILE_READY':
          writeRunHeader(payload);
          return '';
        case 'RUN_BLOCKED':
          appendText(`RUN_BLOCKED: ${(payload.error as any)?.code ?? 'blocked'}`);
          return '';
        case 'CONNECTION_FAILURE':
          appendText(
            `CONN_FAIL: ${payload.code} | ${payload.table ?? '-'} | ${payload.reason}`
          );
          return '';
        case 'LENDER_START':
          return '';
        default:
          return '';
      }
    },

    beginLender(lenderCode, lenderName) {
      currentLender = { lenderCode, lenderName, steps: [] };
    },

    logStep(lenderCode, lenderName, condition) {
      if (condition.result === 'NOT_EVALUATED') return '';
      if (!currentLender || currentLender.lenderCode !== lenderCode) {
        currentLender = { lenderCode, lenderName, steps: [] };
      }
      currentLender.steps.push(shapeStep(condition));
      return '';
    },

    logLenderExit(lenderCode, lenderName, failedCondition, summary) {
      const buffer = currentLender ?? { lenderCode, lenderName, steps: [] };
      flushLenderBlock(buffer, {
        eligible: false,
        failedAt: failedCondition.ruleId,
        failedStep: failedCondition.step,
        errorCode: failedCondition.errorCode,
        passed: summary.passed.length,
        failed: summary.failed.length,
        skipped: summary.skipped.length,
        notRun: summary.notEvaluated.length,
      });
      currentLender = null;
      return '';
    },

    logLenderComplete(lenderCode, lenderName, summary) {
      const buffer = currentLender ?? { lenderCode, lenderName, steps: [] };
      flushLenderBlock(buffer, {
        eligible: true,
        passed: summary.passed.length,
        failed: 0,
        skipped: summary.skipped.length,
        notRun: 0,
      });
      currentLender = null;
      return '';
    },

    logRunComplete(payload) {
      const eligible = (payload.eligibleCount as number) ?? 0;
      const excluded = (payload.excludedCount as number) ?? 0;
      const matched = Array.isArray(payload.eligible)
        ? (payload.eligible as Array<{ lenderCode: string }>).map((e) => e.lenderCode)
        : [];
      const lenders = Array.isArray(payload.lenders)
        ? (payload.lenders as LenderEvalResult[])
        : [];

      appendText('---');
      if (lenders.length) {
        appendText(buildStepFailureSummary(lenders));
        appendText('');
      }
      appendText(
        `RUN_DONE: eligible=${eligible} excluded=${excluded}${matched.length ? ` matched=[${matched.join(', ')}]` : ''}`
      );
      return '';
    },

    logRunError(message) {
      appendText(`RUN_ERROR: ${message}`);
      return '';
    },
  };
}

/** @deprecated Use createEligibilityRunLogger. */
export function appendEligibilityRunLog(record: Record<string, unknown>): string {
  return appendText(JSON.stringify(record, null, 2));
}

/** @deprecated */
export function shapeConditionForLog(condition: ConditionResult) {
  return shapeStep(condition);
}

export const PL_PIPELINE = [
  'PRE_ACTIVE_LENDERS',
  'A1-14-PINCODE',
  'A1-01-CIBIL|A1-FTB',
  'A1-02-AGE',
  'A1-03-INCOME',
  'A1-13-AMOUNT',
  'A1-15-FOIR',
  'A1-DPD',
  'A1-16-CC-UTIL',
  'A1-UNSECURED',
  'A1-04-SALARY_TYPE',
  'A1-05-PF',
  'A1-06-EMPLOYMENT',
  'A1-ENQ-EXCLUDE',
  'A1-11-ENQ-1M',
  'A1-12-ENQ-3M',
] as const;
