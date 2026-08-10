import type { ApplicantProfile, LenderCriteria } from '../../personal-loan-eligibility/utils/types';
import { loadActiveCatalog } from '../utils/catalog-loader';
import { PlScoreErr, PlScoreError } from '../utils/error-codes';
import { evaluateCriterion } from '../utils/scoring-rules';
import { roundHalfUp } from '../utils/rules-map';
import {
  createScoringRunLogger,
  type ScoringRunLogger,
} from '../utils/scoring-file-logger';
import type {
  CriterionScoreResult,
  LenderScoreResult,
  ScoreCriterionId,
  ScoringCatalogRow,
} from '../utils/types';

async function logActivity(strapi: any, params: Record<string, unknown>) {
  try {
    const meta = (params.metadata || {}) as Record<string, unknown>;
    await strapi.service('api::activity-log.activity-log').log({
      ...params,
      leadId: params.leadId ?? meta.leadId,
      leadName: params.leadName ?? meta.leadName,
      correlationId: params.correlationId ?? meta.runId ?? meta.correlationId,
    });
  } catch {
    // non-fatal
  }
}

export interface ScoreEligibleInput {
  leadId: number;
  runId: string;
  loanType?: string;
  profile: ApplicantProfile;
  eligibleLenders: Array<{
    lenderCode: string;
    lenderName?: string;
    lenderType?: string;
  }>;
  criteriaByCode: Map<string, LenderCriteria>;
  fileLog?: ScoringRunLogger;
}

function scoreOneLenderInternal(
  leadId: number,
  profile: ApplicantProfile,
  lender: { lenderCode: string; lenderName?: string; lenderType?: string },
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow[]
): LenderScoreResult {
  const criteriaResults: CriterionScoreResult[] = [];
  const scoringSkipped: ScoreCriterionId[] = [];
  let totalScore = 0;

  const criterionScores: Partial<Record<ScoreCriterionId, number>> = {};

  for (const row of catalog) {
    const result = evaluateCriterion(row.criterionCode, profile, criteria, row);
    if (result.result === 'SCORED') {
      result.points = roundHalfUp(result.points, 0);
      criterionScores[row.criterionCode] = result.points;
      totalScore += result.points;
    } else {
      scoringSkipped.push(row.criterionCode);
    }
    criteriaResults.push(result);
  }

  return {
    leadId,
    lenderCode: lender.lenderCode,
    lenderName: lender.lenderName,
    lenderType: lender.lenderType,
    totalScore,
    criteria: criteriaResults,
    excludedByHardReject: false,
    minInterestRate: criteria.minInterestRate ?? null,
    summary: {
      criterionScores,
      scoringSkipped,
      totalScore,
    },
  };
}

export async function scoreEligibleLenders(
  strapi: any,
  input: ScoreEligibleInput
): Promise<LenderScoreResult[]> {
  const loanType = input.loanType ?? 'Personal Loan';
  const fileLog =
    input.fileLog ??
    (await createScoringRunLogger(
      input.runId,
      input.leadId,
      input.profile.fullName,
      strapi,
      { overwriteLeadLog: true }
    ));

  if (!input.profile.hasBureau) {
    fileLog.writeBlocked(PlScoreErr.BUREAU_SUMMARY_MISSING, 'No bureau summary');
    await logActivity(strapi, {
      action: 'PL_SCORE_BLOCKED',
      description: `PL scoring blocked for lead ${input.leadId}: no bureau summary`,
      severity: 'warning',
      model: 'personal-loan-scoring-criteria',
      leadId: input.leadId,
      leadName: input.profile.fullName ?? null,
      correlationId: input.runId,
      metadata: {
        leadId: input.leadId,
        leadName: input.profile.fullName ?? null,
        runId: input.runId,
        code: PlScoreErr.BUREAU_SUMMARY_MISSING,
      },
    });
    throw new PlScoreError(
      PlScoreErr.BUREAU_SUMMARY_MISSING,
      'Bureau / applicant profile incomplete',
      400,
      { leadId: input.leadId }
    );
  }

  const catalog = await loadActiveCatalog(strapi, loanType);
  fileLog.writeHeader(loanType);

  try {
    const inactiveRows = await strapi.db
      .query('api::personal-loan-scoring-criteria.lender-scoring-criteria')
      .findMany({
        where: { isActive: false, loanType },
        select: ['criterionCode'],
      });
    const inactiveCodes = (inactiveRows || [])
      .map((r: any) => r.criterionCode ?? r.criterion_code)
      .filter(Boolean);
    if (inactiveCodes.length > 0) {
      await logActivity(strapi, {
        action: 'PL_SCORE_CRITERION_INACTIVE',
        description: `Inactive scoring criteria for ${loanType}: ${inactiveCodes.join(', ')}`,
        severity: 'info',
        model: 'personal-loan-scoring-criteria',
        leadId: input.leadId,
        leadName: input.profile.fullName ?? null,
        correlationId: input.runId,
        metadata: {
          leadId: input.leadId,
          leadName: input.profile.fullName ?? null,
          runId: input.runId,
          loanType,
          criterionCodes: inactiveCodes,
        },
      });
    }
  } catch {
    // non-fatal
  }

  await logActivity(strapi, {
    action: 'PL_SCORE_RUN_START',
    description: `PL scoring started for lead ${input.leadId}`,
    severity: 'info',
    model: 'personal-loan-scoring-criteria',
    metadata: {
      leadId: input.leadId,
      runId: input.runId,
      loanType,
      eligibleCount: input.eligibleLenders.length,
    },
  });

  const results: LenderScoreResult[] = [];

  for (const lender of input.eligibleLenders) {
    const criteria = input.criteriaByCode.get(lender.lenderCode);
    if (!criteria) {
      continue;
    }

    const lenderResult = scoreOneLenderInternal(
      input.leadId,
      input.profile,
      lender,
      criteria,
      catalog
    );
    results.push(lenderResult);
    fileLog.writeLenderBlock(lenderResult);

    for (const c of lenderResult.criteria) {
      await logActivity(strapi, {
        action: c.result === 'SKIP' ? 'PL_SCORE_CRITERION_SKIP' : 'PL_SCORE_CRITERION',
        description: `${lender.lenderCode} ${c.criterionId} ${c.result}`,
        severity: c.result === 'SKIP' ? 'info' : 'info',
        model: 'personal-loan-scoring-criteria',
        metadata: {
          leadId: input.leadId,
          lenderCode: lender.lenderCode,
          criterionId: c.criterionId,
          phase: 'SCORING',
          result: c.result,
          ruleType: c.ruleType,
          formula: c.formula,
          rules: c.rules,
          matchedKey: c.matchedKey,
          applicant: c.applicant,
          threshold: c.threshold,
          weight: c.weight,
          points: c.points,
          errorCode: c.errorCode,
        },
      });
    }

    await logActivity(strapi, {
      action: 'PL_SCORE_LENDER',
      description: `${lender.lenderCode} scored ${lenderResult.totalScore}`,
      severity: 'info',
      model: 'personal-loan-scoring-criteria',
      metadata: {
        leadId: input.leadId,
        lenderCode: lender.lenderCode,
        loanType,
        totalScore: lenderResult.totalScore,
        result: 'SCORED',
        summary: lenderResult.summary,
      },
    });
  }

  return results;
}

export async function scoreOneLender(
  strapi: any,
  leadId: number,
  lenderCode: string,
  runId?: string
): Promise<LenderScoreResult> {
  const { runEligibilityMatch } = await import(
    '../../personal-loan-eligibility/utils/eligibility-engine'
  );

  const eligResult = await runEligibilityMatch(strapi, {
    leadId,
    lenderCode,
    source: 'score',
  });

  const fromPipeline = eligResult.scoring?.scored?.find((s) => s.lenderCode === lenderCode);
  if (fromPipeline) {
    return fromPipeline as LenderScoreResult;
  }

  const eligible = eligResult.response.eligible.find((e) => e.lenderCode === lenderCode);
  if (!eligible) {
    throw new PlScoreError(
      PlScoreErr.LENDER_NOT_FOUND,
      'Lender not eligible or unknown',
      404,
      { lenderCode }
    );
  }

  const { buildApplicantProfile } = await import(
    '../../personal-loan-eligibility/utils/applicant-profile'
  );
  const connectionFailures: any[] = [];
  const profile = eligResult.profile ?? (await buildApplicantProfile(strapi, leadId, connectionFailures));

  const criteriaRows = await strapi.db
    .query('api::personal-loan-eligibility.lenders-criteria-pl')
    .findMany({ where: { isActive: true, lenderCode } });
  const criteriaByCode = new Map<string, LenderCriteria>(
    criteriaRows.map((c: LenderCriteria) => [c.lenderCode, c])
  );

  const rid = runId ?? eligResult.runId;
  const scored = await scoreEligibleLenders(strapi, {
    leadId,
    runId: rid,
    profile,
    eligibleLenders: [eligible],
    criteriaByCode,
  });

  return scored[0];
}

export default ({ strapi }: { strapi: any }) => ({
  scoreEligibleLenders: (input: ScoreEligibleInput) => scoreEligibleLenders(strapi, input),
  scoreOneLender: (leadId: number, lenderCode: string, runId?: string) =>
    scoreOneLender(strapi, leadId, lenderCode, runId),
});
