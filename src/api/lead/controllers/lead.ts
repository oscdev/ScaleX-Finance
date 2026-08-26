import { factories } from '@strapi/strapi';
import {
  appendPlLeadSubmissionLog,
  extractErrorMessage,
} from '../../../utils/pl-lead-submission-logger';

export default factories.createCoreController('api::lead.lead', ({ strapi }) => ({
  async create(ctx: any) {
    const requestData = ctx.request?.body?.data ?? {};

    try {
      const result = await super.create(ctx);
      const data = result?.data;
      const attrs = data?.attributes ?? data ?? {};
      const leadId = data?.id ?? attrs?.id;
      const fullName =
        attrs?.fullName ?? requestData.fullName ?? null;

      await appendPlLeadSubmissionLog(strapi, {
        leadId,
        leadName: fullName,
        event: 'LEAD_SUBMIT_SUCCESS',
        form: 'lead',
        fields: requestData as Record<string, unknown>,
        source: 'api',
      });

      return result;
    } catch (err: unknown) {
      await appendPlLeadSubmissionLog(strapi, {
        leadName: requestData.fullName ?? null,
        event: 'LEAD_SUBMIT_ERROR',
        form: 'lead',
        fields: requestData as Record<string, unknown>,
        errors: extractErrorMessage(err),
        source: 'api',
      });
      throw err;
    }
  },

  async logSubmissionAudit(ctx: any) {
    try {
      const body = ctx.request?.body ?? {};
      const { leadId, leadName, form, event, fields, errors, loanType } = body;

      if (!form || !event) {
        return ctx.badRequest('form and event are required');
      }
      if (form !== 'lead' && form !== 'loan-application') {
        return ctx.badRequest('form must be lead or loan-application');
      }

      await appendPlLeadSubmissionLog(strapi, {
        leadId: leadId ?? null,
        leadName: leadName ?? null,
        event: event as any,
        form,
        fields: fields ?? null,
        errors: errors ?? null,
        loanType: loanType ?? null,
        source: 'client',
      });

      return ctx.send({ ok: true });
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      strapi.log.warn(`[pl-lead-submission] Audit log failed: ${message}`);
      return ctx.badRequest(message);
    }
  },
}));
