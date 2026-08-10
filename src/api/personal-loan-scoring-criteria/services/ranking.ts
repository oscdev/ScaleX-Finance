import { PlScoreErr } from '../utils/error-codes';
import type { LenderScoreResult, RankResult, RankedLender } from '../utils/types';
import { MIN_DISPLAY_SCORE } from '../utils/types';
import type { ScoringRunLogger } from '../utils/scoring-file-logger';

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

export function rankForAiMatch(
  leadId: number,
  scored: LenderScoreResult[],
  minDisplayScore = MIN_DISPLAY_SCORE
): RankResult {
  const eligible = scored.filter((l) => !l.excludedByHardReject);

  const displayed: RankedLender[] = eligible
    .filter((l) => l.totalScore >= minDisplayScore)
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      const ra = a.minInterestRate ?? Number.POSITIVE_INFINITY;
      const rb = b.minInterestRate ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
      return a.lenderCode.localeCompare(b.lenderCode);
    })
    .map((l, i) => ({
      ...l,
      rank: i + 1,
      displayed: true,
    }));

  const belowThreshold: RankedLender[] = eligible
    .filter((l) => l.totalScore < minDisplayScore)
    .map((l) => ({
      ...l,
      rank: null,
      displayed: false,
      errorCode: PlScoreErr.BELOW_DISPLAY_THRESHOLD,
    }));

  return {
    leadId,
    phase: 'RANK',
    minDisplayScore,
    formula: 'totalScore = Σ criterion points (0–100); display when totalScore >= 40',
    displayed,
    belowThreshold,
    eliminated: scored
      .filter((l) => l.excludedByHardReject)
      .map((l) => ({
        lenderCode: l.lenderCode,
        excludedByHardReject: true,
        errorCode: PlScoreErr.BELOW_DISPLAY_THRESHOLD,
      })),
  };
}

export async function rankScoredLenders(
  strapi: any,
  leadId: number,
  scored: LenderScoreResult[],
  opts?: { minDisplayScore?: number; runId?: string; fileLog?: ScoringRunLogger }
): Promise<RankResult> {
  const minDisplayScore = opts?.minDisplayScore ?? MIN_DISPLAY_SCORE;
  const rank = rankForAiMatch(leadId, scored, minDisplayScore);

  if (opts?.fileLog) {
    opts.fileLog.writeRankSummary(rank);
    opts.fileLog.writeRunDone(scored.length, rank.displayed.length);
  }

  await logActivity(strapi, {
    action: 'PL_SCORE_RANK_COMPLETE',
    description: `PL rank complete for lead ${leadId}`,
    severity: 'info',
    model: 'personal-loan-scoring-criteria',
    metadata: {
      leadId,
      runId: opts?.runId,
      phase: 'RANK',
      minDisplayScore,
      displayedCount: rank.displayed.length,
      belowThresholdCount: rank.belowThreshold.length,
      result: 'RANKED',
    },
  });

  await logActivity(strapi, {
    action: 'PL_SCORE_RUN_DONE',
    description: `PL scoring done for lead ${leadId}`,
    severity: 'info',
    model: 'personal-loan-scoring-criteria',
    metadata: {
      leadId,
      runId: opts?.runId,
      loanType: 'Personal Loan',
      scored: scored.length,
      displayed: rank.displayed.length,
      result: 'DONE',
    },
  });

  return rank;
}

export default ({ strapi }: { strapi: any }) => ({
  rankForAiMatch: (leadId: number, scored: LenderScoreResult[], minDisplayScore?: number) =>
    rankForAiMatch(leadId, scored, minDisplayScore),
  rankScoredLenders: (
    leadId: number,
    scored: LenderScoreResult[],
    opts?: { minDisplayScore?: number; runId?: string; fileLog?: ScoringRunLogger }
  ) => rankScoredLenders(strapi, leadId, scored, opts),
});
