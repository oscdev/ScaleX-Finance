import type { Core } from '@strapi/strapi';
import {
  loanTypeFromLead,
  readDbString,
} from '../../../utils/code-file-logger';
import { coerceLoanTypeCode } from '../../../utils/loan-type';

/** Keep loan-application.loanType aligned with lead.selectedProduct on create/update. */
export async function syncLoanTypeFromLeadOnWrite(
  strapi: Core.Strapi,
  data: Record<string, unknown>,
  existing?: Record<string, unknown> | null
): Promise<void> {
  const rawLeadId =
    data.leadId ??
    data.lead_id ??
    existing?.leadId ??
    existing?.lead_id;
  const leadId = Number(rawLeadId);
  if (!Number.isFinite(leadId)) return;

  const lead = await strapi.db.query('api::lead.lead').findOne({
    where: { id: leadId },
  });
  const selectedProduct = loanTypeFromLead(lead);
  if (!selectedProduct) {
    // Still coerce any explicit loanType on the payload to a canonical code.
    const raw = readDbString(data, 'loanType', 'loan_type');
    if (raw) data.loanType = coerceLoanTypeCode(raw);
    return;
  }

  const selectedCode = coerceLoanTypeCode(selectedProduct);

  const currentLoanType =
    readDbString(data, 'loanType', 'loan_type') ??
    readDbString(existing ?? undefined, 'loanType', 'loan_type');

  if (!currentLoanType) {
    data.loanType = selectedCode;
    return;
  }

  const currentCode = coerceLoanTypeCode(currentLoanType);
  if (currentCode !== selectedCode) {
    strapi.log.warn(
      `[LoanType] leadId=${leadId} loanApp.loanType=${currentLoanType} != lead.selectedProduct=${selectedProduct}; syncing loanType=${selectedCode}`
    );
  }
  data.loanType = selectedCode;
}
