import { factories } from '@strapi/strapi';
import { PlEligibilityError } from '../utils/error-codes';

function sendError(ctx: any, err: unknown) {
  if (err instanceof PlEligibilityError) {
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

/**
 * Attach custom match actions onto the existing criteria controller,
 * and also register a thin matched-lenders controller file for route handlers.
 */
export default factories.createCoreController(
  'api::personal-loan-eligibility.lenders-criteria-pl',
  ({ strapi }) => ({
    async matchedLenders(ctx: any) {
      try {
        const body = ctx.request.body || {};
        const leadId = Number(body.leadId ?? ctx.query.leadId);
        const service = strapi.service(
          'api::personal-loan-eligibility.matching-engine'
        ) as any;
        const result = await service.runMatch(leadId, {
          source:
            body.source ||
            ctx.query.source ||
            (ctx.request.method === 'GET' ? 'lenders-page' : 'matched-lenders'),
        });
        ctx.body = {
          leadId: result.leadId,
          runId: result.runId,
          lenders: result.response.eligible.map((e: any) => ({
            ...e,
            eligible: true,
            score: null,
            rank: null,
            ruleFailures: [],
          })),
          excluded: result.response.excluded,
          connectionFailures: result.connectionFailures,
        };
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
        const service = strapi.service(
          'api::personal-loan-eligibility.matching-engine'
        ) as any;
        const result = await service.evaluateOne(Number(leadId), String(lenderCode));
        const one = result.lenders[0] || null;
        ctx.body = {
          leadId: result.leadId,
          runId: result.runId,
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
