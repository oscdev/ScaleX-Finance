import { factories } from '@strapi/strapi';
import { BlEligibilityError } from '../utils/error-codes';
import { PlEligibilityError } from '../../personal-loan-eligibility/utils/error-codes';
import {
  isBusinessLoanType,
  resolveLeadLoanTypeFromDb,
} from '../../../utils/code-file-logger';

function sendError(ctx: any, err: unknown) {
  if (err instanceof BlEligibilityError || err instanceof PlEligibilityError) {
    ctx.status = err.httpStatus;
    ctx.body = {
      error: {
        code: err.code,
        message: err.message,
        leadId:
          (err.details as any)?.leadId ??
          ctx.request?.body?.leadId ??
          ctx.query?.leadId ??
          null,
        details: err.details || {},
        httpStatus: err.httpStatus,
      },
    };
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  ctx.status = 500;
  ctx.body = {
    error: {
      code: 'BL_ERR_INTERNAL',
      message,
      details: {},
      httpStatus: 500,
    },
  };
}

function formatPlMatchedBody(result: any) {
  const scoring = result.scoring;
  const displayed = scoring?.rank?.displayed ?? [];
  const belowThreshold = scoring?.rank?.belowThreshold ?? [];

  const scoreByCode = new Map(
    [...displayed, ...belowThreshold].map((l: any) => [l.lenderCode, l])
  );

  const lendersList =
    displayed.length > 0
      ? displayed.map((l: any) => ({
          lenderCode: l.lenderCode,
          lenderName: l.lenderName,
          lenderType: l.lenderType,
          eligible: true,
          score: l.totalScore,
          rank: l.rank,
          ruleFailures: [],
        }))
      : result.response.eligible.map((e: any) => {
          const scored = scoreByCode.get(e.lenderCode);
          return {
            ...e,
            eligible: true,
            score: scored?.totalScore ?? null,
            rank: scored?.rank ?? null,
            ruleFailures: [],
          };
        });

  return {
    leadId: result.leadId,
    loanType: 'Personal Loan',
    runId: result.runId,
    lenders: lendersList,
    excluded: result.response.excluded,
    belowThreshold: belowThreshold.map((l: any) => ({
      lenderCode: l.lenderCode,
      lenderName: l.lenderName,
      eligible: true,
      score: l.totalScore,
      rank: l.rank,
      displayed: false,
      errorCode: l.errorCode,
    })),
    connectionFailures: result.connectionFailures,
  };
}

export default factories.createCoreController(
  'api::business-loan-eligibility.lenders-criteria-bl',
  ({ strapi }) => ({
    async matchedLenders(ctx: any) {
      try {
        const body = ctx.request.body || {};
        const leadId = Number(body.leadId ?? ctx.query.leadId);
        const source =
          body.source ||
          ctx.query.source ||
          (ctx.request.method === 'GET' ? 'lenders-page' : 'matched-lenders');

        const loanType = await resolveLeadLoanTypeFromDb(strapi, leadId);
        // If we know the lead is Personal Loan, run PL engine (correct logs + scoring).
        // Unknown / null → stay on BL path only when explicitly Business; otherwise if
        // not business, delegate to PL (default product).
        if (loanType != null && !isBusinessLoanType(loanType)) {
          const plService = strapi.service(
            'api::personal-loan-eligibility.matching-engine'
          ) as any;
          const result = await plService.runMatch(leadId, { source });
          ctx.body = formatPlMatchedBody(result);
          return;
        }

        const service = strapi.service(
          'api::business-loan-eligibility.matching-engine'
        ) as any;
        const result = await service.runMatch(leadId, { source });

        ctx.body = {
          leadId: result.leadId,
          leadName: result.profile?.fullName ?? null,
          loanType: result.loanType || 'Business Loan',
          source: body.source || ctx.query.source || 'ai-match',
          runId: result.runId,
          eligibleCount: result.response.eligible.length,
          excludedCount: result.response.excluded.length,
          lenders: result.response.eligible,
          excluded: result.response.excluded,
          validations: result.validations,
          connectionFailures: result.connectionFailures,
          logFile: result.logFile ?? null,
        };
      } catch (err) {
        strapi.log.error('[BL Eligibility matchedLenders]', err);
        sendError(ctx, err);
      }
    },

    async evaluate(ctx: any) {
      try {
        const { leadId, lenderCode } = ctx.request.body || {};
        if (!lenderCode) {
          ctx.status = 400;
          ctx.body = {
            error: {
              code: 'BL_ERR_VALIDATION',
              message: 'lenderCode is required',
              details: {},
              httpStatus: 400,
            },
          };
          return;
        }
        const id = Number(leadId);
        const loanType = await resolveLeadLoanTypeFromDb(strapi, id);
        if (loanType != null && !isBusinessLoanType(loanType)) {
          const plService = strapi.service(
            'api::personal-loan-eligibility.matching-engine'
          ) as any;
          const result = await plService.evaluateOne(id, String(lenderCode));
          const one = result.lenders[0] || null;
          ctx.body = {
            leadId: result.leadId,
            runId: result.runId,
            loanType: 'Personal Loan',
            lenderCode,
            eligible: one?.eligible ?? false,
            rules: one?.conditions || [],
            passed: one?.passed || [],
            failed: one?.failed || [],
            connectionFailures: result.connectionFailures,
          };
          return;
        }

        const service = strapi.service(
          'api::business-loan-eligibility.matching-engine'
        ) as any;
        const result = await service.evaluateOne(id, String(lenderCode));
        const one = result.lenders[0] || null;
        ctx.body = {
          leadId: result.leadId,
          runId: result.runId,
          loanType: result.loanType || 'Business Loan',
          lenderCode,
          eligible: one?.eligible ?? false,
          rules: one?.conditions || [],
          passed: one?.passed || [],
          failed: one?.failed || [],
          connectionFailures: result.connectionFailures,
          logFile: result.logFile ?? null,
        };
      } catch (err) {
        strapi.log.error('[BL Eligibility evaluate]', err);
        sendError(ctx, err);
      }
    },
  })
);
