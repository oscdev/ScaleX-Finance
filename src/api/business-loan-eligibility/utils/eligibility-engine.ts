import { BlErr, BlEligibilityError } from './error-codes';
import { buildBlApplicantProfile } from './applicant-profile';
import {
  createEligibilityRunLogger,
  getLogFilePath,
  newRunId,
  type EligibilityRunLogger,
} from './eligibility-file-logger';
import { PIPELINE_RULE_ORDER, getRuleCatalog } from './rule-catalog';
import {
  evaluateActive,
  evaluateAge,
  evaluateAudited,
  evaluateCcu,
  evaluateCibilOrFtb,
  evaluateCurrentOverdue,
  evaluateDpd,
  evaluateEnquiryCounts,
  evaluateEnquiryExclude,
  evaluateEntity,
  evaluateFoir,
  evaluateLoanAmount,
  evaluateSettledWo,
  evaluateTurnover,
  evaluateUnsecured,
  evaluateVintage,
  evaluateZipcode,
  notEvaluated,
} from './eligibility-rules';
import type {
  BlApplicantProfile,
  BlLenderCriteria,
  CatalogLender,
  ConditionResult,
  ConnectionFailure,
  LenderEvalResult,
  MatchRunResult,
} from './types';

function summarize(conditions: ConditionResult[]): Pick<
  LenderEvalResult,
  'passed' | 'failed' | 'skipped' | 'notEvaluated' | 'errorCodes' | 'eligible'
> {
  const passed: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];
  const notEvaluatedIds: string[] = [];
  const errorCodes: string[] = [];
  for (const c of conditions) {
    if (c.result === 'PASS') passed.push(c.ruleId);
    else if (c.result === 'FAIL') {
      failed.push(c.ruleId);
      if (c.errorCode) errorCodes.push(c.errorCode);
    } else if (c.result === 'SKIP') skipped.push(c.ruleId);
    else notEvaluatedIds.push(c.ruleId);
  }
  return {
    passed,
    failed,
    skipped,
    notEvaluated: notEvaluatedIds,
    errorCodes,
    eligible: failed.length === 0 && conditions.some((c) => c.result === 'PASS'),
  };
}

function markRemainingNotEvaluated(
  conditions: ConditionResult[],
  priorFailRuleId: string
) {
  const evaluated = new Set(conditions.map((c) => c.ruleId));
  const cibilEvaluated = evaluated.has('BL-CIBIL');
  const ftbEvaluated = evaluated.has('BL-FTB');

  for (const ruleId of PIPELINE_RULE_ORDER) {
    if (evaluated.has(ruleId)) continue;
    if (ruleId === 'BL-CIBIL' && ftbEvaluated) continue;
    if (ruleId === 'BL-FTB' && cibilEvaluated) continue;

    const catalog = getRuleCatalog(ruleId);
    const ne = notEvaluated(catalog?.step ?? 0, ruleId, priorFailRuleId);
    conditions.push(ne);
  }
}

function buildLenderResult(
  catalog: CatalogLender,
  conditions: ConditionResult[]
): LenderEvalResult {
  const sum = summarize(conditions);
  return {
    lenderCode: catalog.lenderCode,
    lenderName: catalog.lenderName,
    lenderType: catalog.lenderType,
    conditions,
    ...sum,
    eligible: sum.failed.length === 0 && sum.eligible,
  };
}

type LenderStepHooks = {
  onStep: (c: ConditionResult) => void;
  onExit: (failed: ConditionResult, summary: ReturnType<typeof summarize>) => void;
  onComplete: (summary: ReturnType<typeof summarize>) => void;
};

function evaluateLenderSteps(
  catalog: CatalogLender,
  criteria: BlLenderCriteria | undefined,
  profile: BlApplicantProfile,
  zipRows: any[],
  hooks?: LenderStepHooks
): LenderEvalResult {
  const conditions: ConditionResult[] = [];
  const onStep = (c: ConditionResult) => hooks?.onStep(c);

  const runOne = (result: ConditionResult): ConditionResult | null => {
    conditions.push(result);
    onStep(result);
    return result.result === 'FAIL' ? result : null;
  };

  const runMany = (results: ConditionResult[]): ConditionResult | null => {
    for (const r of results) {
      const fail = runOne(r);
      if (fail) return fail;
    }
    return null;
  };

  const finishEarly = (failed: ConditionResult): LenderEvalResult => {
    markRemainingNotEvaluated(conditions, failed.ruleId);
    const result = buildLenderResult(catalog, conditions);
    hooks?.onExit(failed, summarize(conditions));
    return { ...result, eligible: false };
  };

  // 1 ACTIVE
  const step1 = evaluateActive(1, catalog, criteria || null);
  const fail1 = runOne(step1);
  if (fail1 || !criteria) {
    return finishEarly(fail1 || step1);
  }

  // 2 PINCODE (always evaluate)
  const fail2 = runOne(evaluateZipcode(2, profile, criteria, zipRows));
  if (fail2) return finishEarly(fail2);

  // 3 CIBIL | FTB
  const fail3 = runOne(evaluateCibilOrFtb(3, profile, criteria));
  if (fail3) return finishEarly(fail3);

  // 4 CURRENT-OVERDUE
  const fail4 = runOne(evaluateCurrentOverdue(4, profile, criteria));
  if (fail4) return finishEarly(fail4);

  // 5 AGE
  const fail5 = runOne(evaluateAge(5, profile, criteria));
  if (fail5) return finishEarly(fail5);

  // 6 ENTITY
  const fail6 = runOne(evaluateEntity(6, profile, criteria));
  if (fail6) return finishEarly(fail6);

  // 7 TURNOVER
  const fail7 = runOne(evaluateTurnover(7, profile, criteria));
  if (fail7) return finishEarly(fail7);

  // 8 VINTAGE
  const fail8 = runOne(evaluateVintage(8, profile, criteria));
  if (fail8) return finishEarly(fail8);

  // 9 AMOUNT
  const fail9 = runOne(evaluateLoanAmount(9, profile, criteria));
  if (fail9) return finishEarly(fail9);

  // 10 FOIR
  const fail10 = runOne(evaluateFoir(10, profile, criteria));
  if (fail10) return finishEarly(fail10);

  // 11 CC-UTIL
  const fail11 = runOne(evaluateCcu(11, profile, criteria));
  if (fail11) return finishEarly(fail11);

  // 12–14 DPD-3M / 12M / DAYS
  const failDpd = runMany(evaluateDpd(profile, criteria));
  if (failDpd) return finishEarly(failDpd);

  // 15 UNSECURED
  const fail15 = runOne(evaluateUnsecured(15, profile, criteria));
  if (fail15) return finishEarly(fail15);

  // 16 ENQ-EXCLUDE
  const fail16 = runOne(evaluateEnquiryExclude(16, profile, catalog));
  if (fail16) return finishEarly(fail16);

  // 17–18 ENQ-1M / 3M
  const failEnq = runMany(evaluateEnquiryCounts(profile, criteria));
  if (failEnq) return finishEarly(failEnq);

  // 19 AUDITED
  const fail19 = runOne(evaluateAudited(19, profile, criteria));
  if (fail19) return finishEarly(fail19);

  // 20 SETTLED-WO
  const fail20 = runOne(evaluateSettledWo(20, profile, criteria));
  if (fail20) return finishEarly(fail20);

  const result = buildLenderResult(catalog, conditions);
  hooks?.onComplete(summarize(conditions));
  return result;
}

async function loadCatalogAndCriteria(
  strapi: any,
  connectionFailures: ConnectionFailure[],
  onlyLenderCode?: string
): Promise<{ catalog: CatalogLender[]; criteriaByCode: Map<string, BlLenderCriteria> }> {
  let catalogRows: any[] = [];
  try {
    const where: any = { isActive: true };
    if (onlyLenderCode) where.lenderCode = onlyLenderCode;
    catalogRows = await strapi.db.query('api::lender-master.lenders-catalog').findMany({
      where,
      limit: 500,
    });
  } catch (err: any) {
    connectionFailures.push({
      code: BlErr.CONN_CATALOG,
      target: 'api::lender-master.lenders-catalog',
      table: 'lenders_catalog',
      reason: err?.message || String(err),
      step: 1,
    });
    throw new BlEligibilityError(BlErr.CONN_CATALOG, err?.message || 'Catalog query failed', 503);
  }

  let criteriaRows: any[] = [];
  try {
    const where: any = { isActive: true };
    if (onlyLenderCode) where.lenderCode = onlyLenderCode;
    criteriaRows = await strapi.db
      .query('api::business-loan-eligibility.lenders-criteria-bl')
      .findMany({ where, limit: 500 });
  } catch (err: any) {
    connectionFailures.push({
      code: BlErr.CONN_CRITERIA,
      target: 'api::business-loan-eligibility.lenders-criteria-bl',
      table: 'lenders_criteria_bl',
      reason: err?.message || String(err),
      step: 1,
    });
    throw new BlEligibilityError(BlErr.CONN_CRITERIA, err?.message || 'Criteria query failed', 503);
  }

  const catalog: CatalogLender[] = (catalogRows || []).map((r) => ({
    id: r.id,
    lenderCode: r.lenderCode,
    lenderName: r.lenderName,
    lenderType: r.lenderType,
    isActive: !!r.isActive,
  }));

  const criteriaByCode = new Map<string, BlLenderCriteria>();
  for (const r of criteriaRows || []) {
    criteriaByCode.set(r.lenderCode, r as BlLenderCriteria);
  }
  return { catalog, criteriaByCode };
}

async function loadZipRows(
  strapi: any,
  lenderCode: string,
  connectionFailures: ConnectionFailure[]
): Promise<any[]> {
  try {
    return await strapi.db.query('api::lender-master.zip-code').findMany({
      where: { lenderCode, isActive: true },
      limit: 5000,
    });
  } catch (err: any) {
    connectionFailures.push({
      code: BlErr.CONN_ZIP,
      target: 'api::lender-master.zip-code',
      table: 'zip_codes_to_lenders',
      reason: err?.message || String(err),
      step: 2,
      lenderCode,
    });
    return [];
  }
}

async function logActivity(strapi: any, params: Record<string, unknown>) {
  try {
    const logger: any = strapi.service('api::activity-log.activity-log');
    if (!logger?.logEvent) return;
    const meta = (params.metadata || {}) as Record<string, unknown>;
    await logger.logEvent({
      ...params,
      leadId: params.leadId ?? meta.leadId,
      leadName: params.leadName ?? meta.leadName,
      correlationId: params.correlationId ?? meta.runId ?? meta.correlationId,
    });
  } catch {
    // never break matching on activity-log failure
  }
}

function lenderHooks(
  fileLog: EligibilityRunLogger,
  lenderCode: string,
  lenderName: string
): LenderStepHooks {
  fileLog.beginLender(lenderCode, lenderName);
  return {
    onStep: (c) => fileLog.logStep(lenderCode, lenderName, c),
    onExit: (failed, summary) => fileLog.logLenderExit(lenderCode, lenderName, failed, summary),
    onComplete: (summary) => fileLog.logLenderComplete(lenderCode, lenderName, summary),
  };
}

export async function runBlEligibilityMatch(
  strapi: any,
  opts: { leadId: number; lenderCode?: string; source?: string }
): Promise<MatchRunResult> {
  const runId = newRunId();
  const fileLog = await createEligibilityRunLogger(runId, Number(opts.leadId), strapi, {
    overwriteLeadLog: true,
  });
  const connectionFailures: ConnectionFailure[] = [];
  const leadId = Number(opts.leadId);

  if (!Number.isFinite(leadId) || leadId <= 0) {
    throw new BlEligibilityError(
      BlErr.VALIDATION,
      'leadId is required and must be a positive integer',
      400
    );
  }

  fileLog.log('RUN_START', {
    source: opts.source || 'matched-lenders',
    lenderCode: opts.lenderCode || null,
  });

  await logActivity(strapi, {
    action: 'BL_ELIGIBILITY_RUN_START',
    description: `BL eligibility run start for lead ${leadId}`,
    severity: 'info',
    model: 'business-loan-eligibility',
    leadId,
    correlationId: runId,
    metadata: { leadId, runId, source: opts.source || 'matched-lenders' },
  });

  let profile: BlApplicantProfile;
  try {
    profile = await buildBlApplicantProfile(strapi, leadId, connectionFailures);
  } catch (err: any) {
    const code = err.blCode || err.plCode || BlErr.INTERNAL;
    const status = err.httpStatus || 500;
    if (code === BlErr.LEAD_NOT_FOUND) {
      throw new BlEligibilityError(BlErr.LEAD_NOT_FOUND, err.message, 404);
    }
    if (connectionFailures.length) {
      throw new BlEligibilityError(
        connectionFailures[0].code as any,
        connectionFailures[0].reason,
        503,
        { connectionFailures }
      );
    }
    throw new BlEligibilityError(code, err.message || 'Failed to build applicant profile', status);
  }

  fileLog.log('PROFILE_READY', {
    leadName: profile.fullName,
    applicantPin: profile.pinCode,
    requestedAmount: profile.requestedAmount,
    loanAmount: profile.loanAmount,
    loanType: profile.loanType || 'Business Loan',
    hasBureau: profile.hasBureau,
    hasLoanApp: profile.hasLoanApp,
    cibilScore: profile.cibilScore,
    isFirstTimeBorrower: profile.isFirstTimeBorrower,
    latestPaymentMonth: profile.latestPaymentMonth,
  });

  if (!profile.hasLoanApp) {
    await logActivity(strapi, {
      action: 'BL_ELIGIBILITY_BLOCKED',
      description: `No loan application for lead ${leadId}`,
      severity: 'warning',
      model: 'business-loan-eligibility',
      metadata: { leadId, runId, code: BlErr.LOAN_APP_MISSING },
    });
    fileLog.log('RUN_BLOCKED', {
      error: {
        code: BlErr.LOAN_APP_MISSING,
        message: 'No loan application for lead; matching blocked',
      },
    });
    throw new BlEligibilityError(
      BlErr.LOAN_APP_MISSING,
      'No loan application for lead; matching blocked',
      422,
      { leadId }
    );
  }

  if (!profile.hasBureau) {
    await logActivity(strapi, {
      action: 'BL_ELIGIBILITY_BLOCKED',
      description: `No bureau summary for lead ${leadId}`,
      severity: 'warning',
      model: 'business-loan-eligibility',
      metadata: { leadId, runId, code: BlErr.BUREAU_SUMMARY_MISSING },
    });
    fileLog.log('RUN_BLOCKED', {
      error: {
        code: BlErr.BUREAU_SUMMARY_MISSING,
        message: 'No bureau summary for lead; matching blocked',
      },
    });
    throw new BlEligibilityError(
      BlErr.BUREAU_SUMMARY_MISSING,
      'No bureau summary for lead; matching blocked',
      422,
      { leadId }
    );
  }

  try {
    await strapi.db.query('api::lender-master.zip-code').findMany({ limit: 1 });
  } catch (err: any) {
    const cf = {
      code: BlErr.CONN_ZIP,
      target: 'api::lender-master.zip-code',
      table: 'zip_codes_to_lenders',
      reason: err?.message || String(err),
      step: 1,
    };
    connectionFailures.push(cf);
    fileLog.log('CONNECTION_FAILURE', cf);
  }

  let catalog: CatalogLender[];
  let criteriaByCode: Map<string, BlLenderCriteria>;
  try {
    ({ catalog, criteriaByCode } = await loadCatalogAndCriteria(
      strapi,
      connectionFailures,
      opts.lenderCode
    ));
  } catch (err: any) {
    fileLog.logRunError(err?.message || String(err));
    throw err;
  }

  if (opts.lenderCode && catalog.length === 0) {
    throw new BlEligibilityError(
      BlErr.LENDER_NOT_FOUND,
      `Lender ${opts.lenderCode} not found or inactive`,
      404
    );
  }

  const lenders: LenderEvalResult[] = [];
  try {
    for (const cat of catalog) {
      const criteria = criteriaByCode.get(cat.lenderCode);
      const zipRows = criteria
        ? await loadZipRows(strapi, cat.lenderCode, connectionFailures)
        : [];
      const evalResult = evaluateLenderSteps(
        cat,
        criteria,
        profile,
        zipRows,
        lenderHooks(fileLog, cat.lenderCode, cat.lenderName)
      );
      lenders.push(evalResult);

      const overdueCond = evalResult.conditions.find((c) => c.ruleId === 'BL-CURRENT-OVERDUE');
      if (overdueCond && overdueCond.result !== 'NOT_EVALUATED') {
        const isSkip = overdueCond.result === 'SKIP';
        await logActivity(strapi, {
          action: isSkip ? 'BL_ELIGIBILITY_RULE_SKIP' : 'BL_ELIGIBILITY_RULE',
          description: `${cat.lenderCode} BL-CURRENT-OVERDUE ${overdueCond.result}`,
          severity: overdueCond.result === 'FAIL' ? 'warning' : 'info',
          model: 'business-loan-eligibility',
          leadId,
          correlationId: runId,
          metadata: {
            leadId,
            runId,
            lenderCode: cat.lenderCode,
            ruleId: 'BL-CURRENT-OVERDUE',
            result: overdueCond.result,
            errorCode: overdueCond.errorCode,
            applicantValue: overdueCond.applicantValue,
            threshold: overdueCond.threshold,
            reason: overdueCond.reason,
          },
        });
      }

      await logActivity(strapi, {
        action: 'BL_ELIGIBILITY_LENDER',
        description: `${cat.lenderCode} eligibility ${evalResult.eligible ? 'PASS' : 'FAIL'}`,
        severity: evalResult.eligible ? 'info' : 'warning',
        model: 'business-loan-eligibility',
        metadata: {
          leadId,
          runId,
          lenderCode: cat.lenderCode,
          result: evalResult.eligible ? 'PASS' : 'FAIL',
          passed: evalResult.passed,
          failed: evalResult.failed,
          skipped: evalResult.skipped,
          notEvaluated: evalResult.notEvaluated,
          errorCodes: evalResult.errorCodes,
        },
      });
    }
  } catch (err: any) {
    fileLog.logRunError(err?.message || String(err));
    throw err;
  }

  const response: MatchRunResult['response'] = {
    eligible: lenders
      .filter((l) => l.eligible)
      .map((l) => ({
        lenderCode: l.lenderCode,
        lenderName: l.lenderName,
        lenderType: l.lenderType,
        eligible: true as const,
        ruleFailures: [] as string[],
        passed: l.passed,
        failed: [] as string[],
      })),
    excluded: lenders
      .filter((l) => !l.eligible)
      .map((l) => {
        const firstFail = l.conditions.find((c) => c.result === 'FAIL');
        return {
          lenderCode: l.lenderCode,
          lenderName: l.lenderName,
          eligible: false as const,
          failedAt: firstFail?.ruleId,
          failedStep: firstFail?.step,
          errorCode: firstFail?.errorCode ?? null,
          ruleFailures: l.failed,
          errorCodes: l.errorCodes,
        };
      }),
  };

  const logFile = getLogFilePath(leadId, profile.fullName);

  const result: MatchRunResult = {
    leadId,
    runId,
    loanType: 'Business Loan',
    profile,
    lenders,
    response,
    connectionFailures,
    validations: { ok: true, errors: [] },
    error: null,
    logFile,
  };

  fileLog.logRunComplete({
    eligibleCount: response.eligible.length,
    excludedCount: response.excluded.length,
    eligible: response.eligible,
    lenders,
  });

  for (const cf of connectionFailures) {
    await logActivity(strapi, {
      action: 'BL_ELIGIBILITY_CONNECTION_FAILED',
      description: `${cf.code}: ${cf.reason}`,
      severity: 'error',
      model: 'business-loan-eligibility',
      metadata: { leadId, runId, ...cf },
    });
  }

  await logActivity(strapi, {
    action: 'BL_ELIGIBILITY_RUN_COMPLETE',
    description: `BL eligibility complete for lead ${leadId}: ${response.eligible.length} eligible / ${response.excluded.length} excluded`,
    severity: 'info',
    model: 'business-loan-eligibility',
    metadata: {
      leadId,
      runId,
      eligibleCount: response.eligible.length,
      excludedCount: response.excluded.length,
    },
  });

  await logActivity(strapi, {
    action: 'AI_MATCH_GENERATED',
    description: `AI Match generated for lead ${leadId}`,
    severity: 'info',
    model: 'business-loan-eligibility',
    metadata: {
      leadId,
      runId,
      loanType: 'Business Loan',
      eligible: response.eligible.map((e) => e.lenderCode),
    },
  });

  return result;
}
