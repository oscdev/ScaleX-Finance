import { PlScoreError } from '../utils/error-codes';
import type { ScoringRunResult } from '../utils/types';

function sendError(ctx: any, err: unknown) {
  if (err instanceof PlScoreError) {
    ctx.status = err.httpStatus;
    ctx.body = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details || {},
      },
    };
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  ctx.status = 500;
  ctx.body = {
    error: {
      code: 'PL_SCORE_ERR_INTERNAL',
      message,
      details: {},
    },
  };
}

export default {
  async score(ctx: any) {
    try {
      const { leadId, lenderCode } = ctx.request.body || {};
      if (!leadId || !lenderCode) {
        ctx.status = 400;
        ctx.body = {
          error: {
            code: 'PL_SCORE_ERR_VALIDATION',
            message: 'leadId and lenderCode are required',
            details: {},
          },
        };
        return;
      }

      const scoring = ctx.strapi.service(
        'api::personal-loan-scoring-criteria.scoring'
      ) as any;
      const result = await scoring.scoreOneLender(Number(leadId), String(lenderCode));

      ctx.body = {
        leadId: Number(leadId),
        lenderCode: String(lenderCode),
        pipeline: ['ELIGIBILITY', 'SCORING'],
        eligibilityNote: { passed: true, eliminated: false },
        totalScore: result.totalScore,
        excludedByHardReject: false,
        criteria: result.criteria.map((c: any) => ({
          criterionId: c.criterionId,
          phase: c.phase,
          weight: c.weight,
          points: c.points,
          formula: c.formula,
          ruleType: c.ruleType,
          rules: c.rules,
          matchedKey: c.matchedKey,
          applicantValue: c.applicant,
          threshold: c.threshold,
          result: c.result,
          errorCode: c.errorCode,
          concessionApplied: c.concessionApplied ?? false,
        })),
      };
    } catch (err) {
      ctx.strapi.log.error('[PL Scoring score]', err);
      sendError(ctx, err);
    }
  },

  async rank(ctx: any) {
    try {
      const { leadId, minDisplayScore } = ctx.request.body || {};
      if (!leadId) {
        ctx.status = 400;
        ctx.body = {
          error: {
            code: 'PL_SCORE_ERR_VALIDATION',
            message: 'leadId is required',
            details: {},
          },
        };
        return;
      }

      const { runEligibilityMatch } = await import(
        '../../personal-loan-eligibility/utils/eligibility-engine'
      );
      const eligResult = await runEligibilityMatch(ctx.strapi, {
        leadId: Number(leadId),
        source: 'rank-api',
      });

      let scoringResult: ScoringRunResult | null | undefined = eligResult.scoring as
        | ScoringRunResult
        | null
        | undefined;
      if (!scoringResult) {
        const { runFullScoringPipeline } = await import('../utils/pipeline');
        scoringResult = await runFullScoringPipeline(ctx.strapi, {
          leadId: Number(leadId),
          eligResult,
          minDisplayScore: minDisplayScore != null ? Number(minDisplayScore) : undefined,
        });
      } else if (minDisplayScore != null && minDisplayScore !== scoringResult.rank.minDisplayScore) {
        const ranking = ctx.strapi.service(
          'api::personal-loan-scoring-criteria.ranking'
        ) as any;
        scoringResult = {
          ...scoringResult,
          rank: ranking.rankForAiMatch(
            Number(leadId),
            scoringResult.scored,
            Number(minDisplayScore)
          ),
        };
      }

      const result = scoringResult;

      ctx.body = {
        leadId: result.leadId,
        phase: 'RANK',
        minDisplayScore: result.rank.minDisplayScore,
        formula: result.rank.formula,
        displayed: result.rank.displayed.map((l) => ({
          lenderCode: l.lenderCode,
          totalScore: l.totalScore,
          rank: l.rank,
          displayed: l.displayed,
        })),
        belowThreshold: result.rank.belowThreshold.map((l) => ({
          lenderCode: l.lenderCode,
          totalScore: l.totalScore,
          rank: l.rank,
          displayed: l.displayed,
          errorCode: l.errorCode,
        })),
        eliminated: result.rank.eliminated,
      };
    } catch (err) {
      ctx.strapi.log.error('[PL Scoring rank]', err);
      sendError(ctx, err);
    }
  },
};
