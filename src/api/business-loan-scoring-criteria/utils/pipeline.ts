import type {
  BlLenderCriteria,
  MatchRunResult,
} from '../../business-loan-eligibility/utils/types';
import { createScoringRunLogger } from '../../personal-loan-scoring-criteria/utils/scoring-file-logger';
import type { ScoringRunResult } from './types';

export async function runFullBlScoringPipeline(
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
    { overwriteLeadLog: true, loanType: 'Business Loan' }
  );

  const criteriaRows = await strapi.db
    .query('api::business-loan-eligibility.lenders-criteria-bl')
    .findMany({ where: { isActive: true } });
  const criteriaByCode = new Map<string, BlLenderCriteria>(
    criteriaRows.map((c: BlLenderCriteria) => [c.lenderCode, c])
  );

  const scoring = strapi.service('api::business-loan-scoring-criteria.scoring') as any;
  const ranking = strapi.service('api::business-loan-scoring-criteria.ranking') as any;

  const scored = await scoring.scoreEligibleLenders({
    leadId,
    runId: eligResult.runId,
    loanType: 'Business Loan',
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
    loanType: 'Business Loan',
    scored,
    rank,
  };
}
