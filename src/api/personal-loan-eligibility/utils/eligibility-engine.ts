import { PlErr, PlEligibilityError } from './error-codes';
import { buildApplicantProfile } from './applicant-profile';
import {
  createEligibilityRunLogger,
  newRunId,
  type EligibilityRunLogger,
} from './eligibility-file-logger';
import { PIPELINE_RULE_ORDER, getRuleCatalog } from './rule-catalog';
import {
  evaluateActive,
  evaluateAge,
  evaluateCcu,
  evaluateCibilOrFtb,
  evaluateDpd,
  evaluateEmployment,
  evaluateEnquiryCounts,
  evaluateEnquiryExclude,
  evaluateFoir,
  evaluateIncome,
  evaluateLatestDpd,
  evaluateLoanAmount,
  evaluatePf,
  evaluateSalaryType,
  evaluateUnsecured,
  evaluateZipcode,
  notEvaluated,
} from './eligibility-rules';
import type {
  CatalogLender,
  ConditionResult,
  ConnectionFailure,
  LenderCriteria,
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
  const cibilEvaluated = evaluated.has('PL-CIBIL');
  const ftbEvaluated = evaluated.has('PL-FTB');

  for (const ruleId of PIPELINE_RULE_ORDER) {
    if (evaluated.has(ruleId)) continue;
    if (ruleId === 'PL-CIBIL' && ftbEvaluated) continue;
    if (ruleId === 'PL-FTB' && cibilEvaluated) continue;

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
  criteria: LenderCriteria | undefined,
  profile: any,
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

  // Step 1 — active lenders + criteria
  const step1 = evaluateActive(1, catalog, criteria || null);
  const fail1 = runOne(step1);
  if (fail1 || !criteria) {
    return finishEarly(fail1 || step1);
  }

  // Step 2 — zipcode
  const fail2 = runOne(evaluateZipcode(2, profile, criteria, zipRows));
  if (fail2) return finishEarly(fail2);

  // Step 3 — CIBIL or FTB branch
  const fail3 = runOne(evaluateCibilOrFtb(3, profile, criteria));
  if (fail3) return finishEarly(fail3);

  // Step 4 — latest open-account DPD vs max_dpd_days_allowed
  const fail4 = runOne(evaluateLatestDpd(4, profile, criteria));
  if (fail4) return finishEarly(fail4);

  // Steps 5–8
  const fail5 = runOne(evaluateAge(5, profile, criteria));
  if (fail5) return finishEarly(fail5);
  const fail6 = runOne(evaluateIncome(6, profile, criteria));
  if (fail6) return finishEarly(fail6);
  const fail7 = runOne(evaluateLoanAmount(7, profile, criteria));
  if (fail7) return finishEarly(fail7);
  const fail8 = runOne(evaluateFoir(8, profile, criteria));
  if (fail8) return finishEarly(fail8);

  // Steps 9–11 — DPD 3m / 12m / max days
  const failDpd = runMany(evaluateDpd(profile, criteria));
  if (failDpd) return finishEarly(failDpd);

  // Steps 12–16
  const fail12 = runOne(evaluateCcu(12, profile, criteria));
  if (fail12) return finishEarly(fail12);
  const fail13 = runOne(evaluateUnsecured(13, profile, criteria));
  if (fail13) return finishEarly(fail13);
  const fail14 = runOne(evaluateSalaryType(14, profile, criteria));
  if (fail14) return finishEarly(fail14);
  const fail15 = runOne(evaluatePf(15, profile, criteria));
  if (fail15) return finishEarly(fail15);
  const fail16 = runOne(evaluateEmployment(16, profile, criteria));
  if (fail16) return finishEarly(fail16);

  // Step 17 — enquiry exclude
  const fail17 = runOne(evaluateEnquiryExclude(17, profile, catalog));
  if (fail17) return finishEarly(fail17);

  // Steps 18–19 — enquiry counts
  const failEnq = runMany(evaluateEnquiryCounts(profile, criteria));
  if (failEnq) return finishEarly(failEnq);

  const result = buildLenderResult(catalog, conditions);
  hooks?.onComplete(summarize(conditions));
  return result;
}

async function loadCatalogAndCriteria(
  strapi: any,
  connectionFailures: ConnectionFailure[],
  onlyLenderCode?: string
): Promise<{ catalog: CatalogLender[]; criteriaByCode: Map<string, LenderCriteria> }> {
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
      code: PlErr.CONN_CATALOG,
      target: 'api::lender-master.lenders-catalog',
      table: 'lenders_catalog',
      reason: err?.message || String(err),
      step: 1,
    });
    throw new PlEligibilityError(PlErr.CONN_CATALOG, err?.message || 'Catalog query failed', 503);
  }

  let criteriaRows: any[] = [];
  try {
    const where: any = { isActive: true };
    if (onlyLenderCode) where.lenderCode = onlyLenderCode;
    criteriaRows = await strapi.db
      .query('api::personal-loan-eligibility.lenders-criteria-pl')
      .findMany({ where, limit: 500 });
  } catch (err: any) {
    connectionFailures.push({
      code: PlErr.CONN_CRITERIA,
      target: 'api::personal-loan-eligibility.lenders-criteria-pl',
      table: 'lenders_criteria_pl',
      reason: err?.message || String(err),
      step: 1,
    });
    throw new PlEligibilityError(PlErr.CONN_CRITERIA, err?.message || 'Criteria query failed', 503);
  }

  const catalog: CatalogLender[] = (catalogRows || []).map((r) => ({
    id: r.id,
    lenderCode: r.lenderCode,
    lenderName: r.lenderName,
    lenderType: r.lenderType,
    isActive: !!r.isActive,
  }));

  const criteriaByCode = new Map<string, LenderCriteria>();
  for (const r of criteriaRows || []) {
    criteriaByCode.set(r.lenderCode, r as LenderCriteria);
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
      code: PlErr.CONN_ZIP,
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

export async function runEligibilityMatch(
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
    throw new PlEligibilityError(PlErr.VALIDATION, 'leadId is required and must be a positive integer', 400);
  }

  fileLog.log('RUN_START', {
    source: opts.source || 'matched-lenders',
    lenderCode: opts.lenderCode || null,
  });

  await logActivity(strapi, {
    action: 'PL_ELIGIBILITY_RUN_START',
    description: `PL eligibility run start for lead ${leadId}`,
    severity: 'info',
    model: 'personal-loan-eligibility',
    leadId,
    correlationId: runId,
    metadata: { leadId, runId, source: opts.source || 'matched-lenders' },
  });

  let profile;
  try {
    profile = await buildApplicantProfile(strapi, leadId, connectionFailures);
  } catch (err: any) {
    const code = err.plCode || PlErr.INTERNAL;
    const status = err.httpStatus || 500;
    if (code === PlErr.LEAD_NOT_FOUND) {
      throw new PlEligibilityError(PlErr.LEAD_NOT_FOUND, err.message, 404);
    }
    if (connectionFailures.length) {
      throw new PlEligibilityError(
        connectionFailures[0].code as any,
        connectionFailures[0].reason,
        503,
        { connectionFailures }
      );
    }
    throw new PlEligibilityError(code, err.message || 'Failed to build applicant profile', status);
  }

  fileLog.log('PROFILE_READY', {
    leadName: profile.fullName,
    applicantPin: profile.pinCode,
    requestedAmount: profile.requestedAmount,
    hasBureau: profile.hasBureau,
    cibilScore: profile.cibilScore,
    isFirstTimeBorrower: profile.isFirstTimeBorrower,
    latestPaymentMonth: profile.latestPaymentMonth,
  });

  if (!profile.hasBureau) {
    await logActivity(strapi, {
      action: 'PL_ELIGIBILITY_BLOCKED',
      description: `No bureau summary for lead ${leadId}`,
      severity: 'warning',
      model: 'personal-loan-eligibility',
      metadata: { leadId, runId, code: PlErr.BUREAU_SUMMARY_MISSING },
    });
    const blockedValidations = {
      ok: false,
      errors: [
        {
          code: PlErr.BUREAU_SUMMARY_MISSING,
          message: 'No cibil-report-summary for lead; matching blocked',
        },
      ],
    };
    fileLog.log('RUN_BLOCKED', {
      error: {
        code: PlErr.BUREAU_SUMMARY_MISSING,
        message: 'No bureau summary for lead; matching blocked',
      },
      validations: blockedValidations,
      connectionFailures,
    });
    throw new PlEligibilityError(
      PlErr.BUREAU_SUMMARY_MISSING,
      'No bureau summary for lead; matching blocked',
      422,
      { leadId }
    );
  }

  // Probe zip table availability (step 1 readiness)
  try {
    await strapi.db.query('api::lender-master.zip-code').findMany({ limit: 1 });
  } catch (err: any) {
    const cf = {
      code: PlErr.CONN_ZIP,
      target: 'api::lender-master.zip-code',
      table: 'zip_codes_to_lenders',
      reason: err?.message || String(err),
      step: 1,
    };
    connectionFailures.push(cf);
    fileLog.log('CONNECTION_FAILURE', cf);
  }

  let catalog: CatalogLender[];
  let criteriaByCode: Map<string, LenderCriteria>;
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

  const lenders: LenderEvalResult[] = [];
  try {
  for (const cat of catalog) {
    const criteria = criteriaByCode.get(cat.lenderCode);
    const zipRows = criteria ? await loadZipRows(strapi, cat.lenderCode, connectionFailures) : [];
    const evalResult = evaluateLenderSteps(
      cat,
      criteria,
      profile,
      zipRows,
      lenderHooks(fileLog, cat.lenderCode, cat.lenderName)
    );
    lenders.push(evalResult);

    const latestDpdCond = evalResult.conditions.find((c) => c.ruleId === 'PL-DPD-LATEST');
    if (latestDpdCond && latestDpdCond.result !== 'NOT_EVALUATED') {
      const isSkip = latestDpdCond.result === 'SKIP';
      await logActivity(strapi, {
        action: isSkip ? 'PL_ELIGIBILITY_RULE_SKIP' : 'PL_ELIGIBILITY_RULE',
        description: `${cat.lenderCode} PL-DPD-LATEST ${latestDpdCond.result}`,
        severity: latestDpdCond.result === 'FAIL' ? 'warning' : 'info',
        model: 'personal-loan-eligibility',
        leadId,
        correlationId: runId,
        metadata: {
          leadId,
          runId,
          lenderCode: cat.lenderCode,
          ruleId: 'PL-DPD-LATEST',
          result: latestDpdCond.result,
          errorCode: latestDpdCond.errorCode,
          applicantValue: latestDpdCond.applicantValue,
          threshold: latestDpdCond.threshold,
          reason: latestDpdCond.reason,
        },
      });
    }

    await logActivity(strapi, {
      action: 'PL_ELIGIBILITY_LENDER',
      description: `${cat.lenderCode} eligibility ${evalResult.eligible ? 'PASS' : 'FAIL'}`,
      severity: evalResult.eligible ? 'info' : 'warning',
      model: 'personal-loan-eligibility',
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

  const response = {
    eligible: lenders
      .filter((l) => l.eligible)
      .map((l) => ({
        lenderCode: l.lenderCode,
        lenderName: l.lenderName,
        lenderType: l.lenderType,
      })),
    excluded: lenders
      .filter((l) => !l.eligible)
      .map((l) => ({
        lenderCode: l.lenderCode,
        lenderName: l.lenderName,
        ruleFailures: l.failed,
        errorCodes: l.errorCodes,
      })),
  };

  const result: MatchRunResult = {
    leadId,
    runId,
    profile,
    lenders,
    response,
    connectionFailures,
    validations: { ok: true, errors: [] },
    error: null,
    scoring: null,
  };

  fileLog.logRunComplete({
    eligibleCount: response.eligible.length,
    excludedCount: response.excluded.length,
    eligible: response.eligible,
    lenders,
  });

  for (const cf of connectionFailures) {
    await logActivity(strapi, {
      action: 'PL_ELIGIBILITY_CONNECTION_FAILED',
      description: `${cf.code}: ${cf.reason}`,
      severity: 'error',
      model: 'personal-loan-eligibility',
      metadata: { leadId, runId, ...cf },
    });
  }

  await logActivity(strapi, {
    action: 'PL_ELIGIBILITY_RUN_COMPLETE',
    description: `PL eligibility complete for lead ${leadId}: ${response.eligible.length} eligible / ${response.excluded.length} excluded`,
    severity: 'info',
    model: 'personal-loan-eligibility',
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
    model: 'personal-loan-eligibility',
    metadata: {
      leadId,
      runId,
      eligible: response.eligible.map((e) => e.lenderCode),
    },
  });

  if (response.eligible.length > 0) {
    try {
      const { runFullScoringPipeline } = await import(
        '../../personal-loan-scoring-criteria/utils/pipeline'
      );
      result.scoring = await runFullScoringPipeline(strapi, {
        leadId,
        eligResult: result,
      });
    } catch (err: any) {
      strapi.log.warn(
        `[PL Scoring] pipeline failed for lead ${leadId}: ${err?.message || err}`
      );
    }
  }

  return result;
}
