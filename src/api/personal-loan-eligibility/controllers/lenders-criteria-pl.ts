import { factories } from '@strapi/strapi';
import { PlEligibilityError } from '../utils/error-codes';
import { BlEligibilityError } from '../../business-loan-eligibility/utils/error-codes';
import {
  isBusinessLoanType,
  loanLogProduct,
  resolveLeadLoanTypeFromDb,
} from '../../../utils/code-file-logger';

function sendError(ctx: any, err: unknown) {
  if (err instanceof PlEligibilityError || err instanceof BlEligibilityError) {
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
      },
    };
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  ctx.status = 500;
  ctx.body = {
    error: {
      code: 'PL_ERR_INTERNAL',
      message,
      details: {},
    },
  };
}

function formatBlMatchedBody(result: any, source: string) {
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
    leadName: result.profile?.fullName ?? null,
    loanType: result.loanType || 'Business Loan',
    source,
    runId: result.runId,
    pipeline: scoring ? ['ELIGIBILITY', 'SCORING', 'RANK'] : ['ELIGIBILITY'],
    eligibleCount: result.response.eligible.length,
    excludedCount: result.response.excluded.length,
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
    validations: result.validations,
    connectionFailures: result.connectionFailures,
    logFile: result.logFile ?? null,
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

/**
 * Attach custom match actions onto the existing criteria controller,
 * and also register a thin matched-lenders controller file for route handlers.
 */
export default factories.createCoreController(
  'api::personal-loan-eligibility.lenders-criteria-pl',
  ({ strapi }) => ({
    async loanType(ctx: any) {
      try {
        const leadId = Number(ctx.query.leadId ?? ctx.request?.body?.leadId);
        if (!Number.isFinite(leadId)) {
          ctx.status = 400;
          ctx.body = {
            error: {
              code: 'PL_ERR_VALIDATION',
              message: 'leadId is required',
              details: {},
            },
          };
          return;
        }
        const loanType =
          (await resolveLeadLoanTypeFromDb(strapi, leadId)) || 'Personal Loan';
        ctx.body = {
          leadId,
          loanType,
          product: loanLogProduct(loanType),
        };
      } catch (err) {
        strapi.log.error('[PL Eligibility loanType]', err);
        sendError(ctx, err);
      }
    },

    async matchedLenders(ctx: any) {
      try {
        const body = ctx.request.body || {};
        const leadId = Number(body.leadId ?? ctx.query.leadId);
        const source =
          body.source ||
          ctx.query.source ||
          (ctx.request.method === 'GET' ? 'lenders-page' : 'matched-lenders');

        const loanType = await resolveLeadLoanTypeFromDb(strapi, leadId);
        if (isBusinessLoanType(loanType)) {
          const blService = strapi.service(
            'api::business-loan-eligibility.matching-engine'
          ) as any;
          const result = await blService.runMatch(leadId, { source });
          ctx.body = formatBlMatchedBody(result, String(source));
          return;
        }

        const service = strapi.service(
          'api::personal-loan-eligibility.matching-engine'
        ) as any;
        const result = await service.runMatch(leadId, { source });
        ctx.body = formatPlMatchedBody(result);
      } catch (err) {
        strapi.log.error('[PL Eligibility matchedLenders]', err);
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
              code: 'PL_ERR_VALIDATION',
              message: 'lenderCode is required',
              details: {},
            },
          };
          return;
        }
        const id = Number(leadId);
        const loanType = await resolveLeadLoanTypeFromDb(strapi, id);
        if (isBusinessLoanType(loanType)) {
          const blService = strapi.service(
            'api::business-loan-eligibility.matching-engine'
          ) as any;
          const result = await blService.evaluateOne(id, String(lenderCode));
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
          return;
        }

        const service = strapi.service(
          'api::personal-loan-eligibility.matching-engine'
        ) as any;
        const result = await service.evaluateOne(id, String(lenderCode));
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
      } catch (err) {
        strapi.log.error('[PL Eligibility evaluate]', err);
        sendError(ctx, err);
      }
    },
  })
);
