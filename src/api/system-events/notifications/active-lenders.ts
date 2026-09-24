import type { Core } from '@strapi/strapi';
import { normalizeLoanTypeCode } from '../../../utils/loan-type';

export type ActiveLendersLoanType = 'PL' | 'BL' | 'NONE';

async function resolveLoanTypeForLead(
  strapi: Core.Strapi,
  leadId: number
): Promise<string | null> {
  try {
    const lead = await strapi.db.query('api::lead.lead').findOne({
      where: { id: leadId },
      select: ['selectedProduct'],
    });
    const product = String(lead?.selectedProduct || '').trim();
    if (product) return product;

    const loanApp = await strapi.db
      .query('api::loan-application.loan-application')
      .findOne({
        where: { leadId },
        select: ['loanType'],
        orderBy: { id: 'desc' },
      });
    const loanType = String(loanApp?.loanType || '').trim();
    return loanType || null;
  } catch {
    return null;
  }
}

/**
 * Active lender codes for a single product funnel.
 * PL → lenders_criteria_pl; BL → lenders_criteria_bl; otherwise empty.
 * Prefer `leadId` so product is resolved server-side (admin JWT cannot rely on /api/leads).
 */
export async function listActiveCriteriaLenderCodes(
  strapi: Core.Strapi,
  loanType?: string | null,
  leadId?: number | null
): Promise<{ data: string[]; loanType: ActiveLendersLoanType }> {
  let resolved = loanType;
  if (leadId != null && Number.isFinite(Number(leadId))) {
    const fromLead = await resolveLoanTypeForLead(strapi, Number(leadId));
    if (fromLead) resolved = fromLead;
  }

  const code = normalizeLoanTypeCode(resolved);

  if (code === 'PL') {
    const plRows = await strapi.db
      .query('api::personal-loan-eligibility.lenders-criteria-pl')
      .findMany({
        where: { isActive: true },
        select: ['lenderCode'],
        limit: 500,
      });
    const data = [
      ...new Set(
        (plRows || [])
          .map((row: { lenderCode?: string }) => String(row.lenderCode || '').trim())
          .filter(Boolean)
      ),
    ].sort();
    return { data, loanType: 'PL' };
  }

  if (code === 'BL') {
    const blRows = await strapi.db
      .query('api::business-loan-eligibility.lenders-criteria-bl')
      .findMany({
        where: { isActive: true },
        select: ['lenderCode'],
        limit: 500,
      });
    const data = [
      ...new Set(
        (blRows || [])
          .map((row: { lenderCode?: string }) => String(row.lenderCode || '').trim())
          .filter(Boolean)
      ),
    ].sort();
    return { data, loanType: 'BL' };
  }

  return { data: [], loanType: 'NONE' };
}
