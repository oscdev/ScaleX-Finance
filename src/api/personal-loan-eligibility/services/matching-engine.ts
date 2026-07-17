/**
 * Strapi service: PL matching orchestration.
 * UID: api::personal-loan-eligibility.matching-engine
 */
import { runEligibilityMatch } from '../utils/eligibility-engine';

export default ({ strapi }: { strapi: any }) => ({
  async runMatch(leadId: number, opts?: { lenderCode?: string; source?: string }) {
    return runEligibilityMatch(strapi, {
      leadId: Number(leadId),
      lenderCode: opts?.lenderCode,
      source: opts?.source || 'matched-lenders',
    });
  },

  async evaluateOne(leadId: number, lenderCode: string) {
    return runEligibilityMatch(strapi, {
      leadId: Number(leadId),
      lenderCode: String(lenderCode),
      source: 'evaluate',
    });
  },
});
