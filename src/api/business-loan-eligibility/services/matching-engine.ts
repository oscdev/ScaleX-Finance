/**
 * Strapi service: BL matching orchestration.
 * UID: api::business-loan-eligibility.matching-engine
 */
import { runBlEligibilityMatch } from '../utils/eligibility-engine';

export default ({ strapi }: { strapi: any }) => ({
  async runMatch(leadId: number, opts?: { lenderCode?: string; source?: string }) {
    return runBlEligibilityMatch(strapi, {
      leadId: Number(leadId),
      lenderCode: opts?.lenderCode,
      source: opts?.source || 'matched-lenders',
    });
  },

  async evaluateOne(leadId: number, lenderCode: string) {
    return runBlEligibilityMatch(strapi, {
      leadId: Number(leadId),
      lenderCode: String(lenderCode),
      source: 'evaluate',
    });
  },
});
