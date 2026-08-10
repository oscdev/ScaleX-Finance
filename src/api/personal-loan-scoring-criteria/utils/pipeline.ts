import type { MatchRunResult } from '../../personal-loan-eligibility/utils/types';
import { createScoringRunLogger } from './scoring-file-logger';
import type { ScoringRunResult } from './types';

export async function runFullScoringPipeline(
  strapi: any,
  opts: {
    leadId: number;
    eligResult: MatchRunResult;
    minDisplayScore?: number;
  }
): Promise<ScoringRunResult> {
  const { leadId, eligResult, minDisplayScore } = opts;
  const profile = eligResult.profile;
  if (!profile) {
    throw new Error('Applicant profile missing from eligibility result');
  }

  const fileLog = await createScoringRunLogger(
    eligResult.runId,
    leadId,
    profile.fullName,
    strapi,
    { overwriteLeadLog: true }
  );

  const criteriaRows = await strapi.db
    .query('api::personal-loan-eligibility.lenders-criteria-pl')
    .findMany({ where: { isActive: true } });
  const criteriaByCode = new Map(
    criteriaRows.map((c: { lenderCode: string }) => [c.lenderCode, c])
  );

  const scoring = strapi.service('api::personal-loan-scoring-criteria.scoring') as any;
  const ranking = strapi.service('api::personal-loan-scoring-criteria.ranking') as any;

  const scored = await scoring.scoreEligibleLenders({
    leadId,
    runId: eligResult.runId,
    profile,
    eligibleLenders: eligResult.response.eligible,
    criteriaByCode,
    fileLog,
  });

  const rank = await ranking.rankScoredLenders(leadId, scored, {
    minDisplayScore,
    runId: eligResult.runId,
    fileLog,
  });

  return {
    leadId,
    runId: eligResult.runId,
    loanType: 'Personal Loan',
    scored,
    rank,
  };
}
