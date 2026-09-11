/**
 * Suite display helpers for Business Loan annual turnover.
 * Loan form_data.businessDetails.turnover stays Lakh (public form contract).
 * CSV / customer.turnover and suite UI use full ₹.
 */

/** Stored Lakh → display ₹. Values already in rupees (>= 1 Lakh ₹) pass through. */
export function turnoverLakhToInr(val) {
  if (val == null || val === '') return val;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return val;
  return n < 100000 ? Math.round(n * 100000) : n;
}

/**
 * BL-TURNOVER / ANNUAL_TURNOVER applicant objects include both units.
 * Show full ₹ only — do not collapse FOIR objects that also carry annualTurnoverInr.
 */
export function applicantDisplayValue(applicant) {
  if (
    applicant != null &&
    typeof applicant === 'object' &&
    !Array.isArray(applicant) &&
    applicant.annualTurnoverInr != null &&
    applicant.turnoverLakh != null &&
    applicant.existingTotalEmi == null &&
    applicant.applicantFoir == null
  ) {
    return applicant.annualTurnoverInr;
  }
  return applicant;
}
