import { randomUUID } from 'crypto';
import path from 'path';
import type { ConditionResult, LenderEvalResult } from './types';
import { getRuleCatalog } from './rule-catalog';
import {
  appendModuleLogIfEnabled,
  isCodeLevelLoggingEnabled,
  resetModuleLeadLog,
  sanitizeLeadName,
  utcDateStamp,
} from '../../../utils/code-file-logger';
import { buildStepFailureSummary } from '../../../utils/lender-run-log-summary';

const MODULE = 'business-loan/bl-eligibility';

export type BlLogEvent =
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

export function newRunId(): string {
  return randomUUID();
}

/** Relative path suggestion: logs/business-loan/bl-eligibility/<leadId>-<Name>_YYYY-MM-DD.log */
export function getLogFilePath(
  leadId: number | string,
  leadName?: string | null,
  d = new Date()
): string {
  const stem = `${leadId}-${sanitizeLeadName(leadName)}`;
  return path.posix.join('logs', MODULE, `${stem}_${utcDateStamp(d)}.log`);
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
  appendText: (text: string) => string,
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

function buildStepFailureSummaryForRun(lenders: LenderEvalResult[]): string {
  return buildStepFailureSummary(lenders, (ruleId) => getRuleCatalog(ruleId)?.ruleName);
}

export interface EligibilityRunLogger {
  runId: string;
  leadId: number;
  log(event: BlLogEvent, payload?: Record<string, unknown>): string;
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

export interface EligibilityRunLoggerOptions {
  leadName?: string | null;
  overwriteLeadLog?: boolean;
}

export async function createEligibilityRunLogger(
  runId: string,
  leadId: number,
  strapi?: any,
  opts?: EligibilityRunLoggerOptions | string | null
): Promise<EligibilityRunLogger> {
  const options: EligibilityRunLoggerOptions =
    typeof opts === 'string' || opts == null
      ? { leadName: typeof opts === 'string' ? opts : null }
      : opts;
  const enabled = await isCodeLevelLoggingEnabled(strapi);
  const overwriteLeadLog = options.overwriteLeadLog ?? false;
  let leadName: string | null | undefined = options.leadName ?? null;
  const leadCtx = () => ({ leadId, leadName });
  const appendText = (text: string) =>
    appendModuleLogIfEnabled(MODULE, text, enabled, leadCtx());

  let currentLender: LenderBuffer | null = null;
  let runSource = 'matched-lenders';

  const writeRunHeader = (profile: Record<string, unknown>) => {
    if (overwriteLeadLog) {
      resetModuleLeadLog(MODULE, leadCtx());
    }
    const lines = [
      `leadId: ${leadId}`,
      `leadName: ${leadName ?? '-'}`,
      `runId: ${runId.slice(0, 8)}`,
      `source: ${runSource}`,
      `profile: ${JSON.stringify({
        pin: profile.applicantPin ?? null,
        amount: profile.loanAmount ?? profile.requestedAmount ?? null,
        loanType: profile.loanType ?? 'Business Loan',
        bureau: profile.hasBureau ?? false,
        loanApp: profile.hasLoanApp ?? false,
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
          if (payload.leadName != null) leadName = String(payload.leadName);
          return '';
        case 'PROFILE_READY':
          if (payload.leadName != null) leadName = String(payload.leadName);
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
      flushLenderBlock(appendText, buffer, {
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
      flushLenderBlock(appendText, buffer, {
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
        appendText(buildStepFailureSummaryForRun(lenders));
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

export const BL_PIPELINE = [
  'BL-PRE-ACTIVE',
  'BL-PINCODE',
  'BL-CIBIL|BL-FTB',
  'BL-CURRENT-OVERDUE',
  'BL-AGE',
  'BL-ENTITY',
  'BL-TURNOVER',
  'BL-VINTAGE',
  'BL-AMOUNT',
  'BL-FOIR',
  'BL-CC-UTIL',
  'BL-DPD-3M',
  'BL-DPD-12M',
  'BL-DPD-DAYS',
  'BL-UNSECURED',
  'BL-ENQ-EXCLUDE',
  'BL-ENQ-1M',
  'BL-ENQ-3M',
  'BL-AUDITED',
  'BL-SETTLED-WO',
] as const;
