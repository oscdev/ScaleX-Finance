/** Loan-application row shape used for submit detection (admin + shared). */
export type LoanAppSubmitCheck = {
  declarationAccepted?: boolean | null;
  form_data?: unknown;
  leadId?: number | string | null;
  lead_id?: number | string | null;
};

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isEmptyValue);
  }
  return false;
}

/** True when form_data has at least one non-empty section field value. */
export function hasMeaningfulFormData(formData: unknown): boolean {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return false;

  const metaKeys = new Set(['pdfPasswords', 'docDates', 'docFormats', 'documents', 'regProofDocuments']);

  for (const [key, section] of Object.entries(formData as Record<string, unknown>)) {
    if (metaKeys.has(key)) continue;
    if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
    if (Object.values(section as Record<string, unknown>).some((v) => !isEmptyValue(v))) {
      return true;
    }
  }

  return false;
}

export function loanAppMatchesLeadId(
  loanApp: LoanAppSubmitCheck | null | undefined,
  leadId: number | string | null | undefined
): boolean {
  if (!loanApp || leadId == null) return false;
  const expected = Number(leadId);
  const actual = Number(loanApp.leadId ?? loanApp.lead_id);
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  return expected === actual;
}

/** True after customer completed frontend `/loan-application` (LOAN_APP_SUBMITTED activity). */
export function isLoanApplicationSubmitted(
  loanApp: LoanAppSubmitCheck | null | undefined,
  opts: { hasSubmitActivity?: boolean } = {}
): boolean {
  if (opts.hasSubmitActivity === true) return true;
  if (!loanApp || loanApp.declarationAccepted !== true) return false;
  return hasMeaningfulFormData(loanApp.form_data);
}

/**
 * Stale automation/script prefill: declaration accepted + data but no frontend submit log.
 * Display is hidden; admin can still edit and save (which clears the declaration flag).
 */
export function isStaleLoanFormPrefill(
  loanApp: LoanAppSubmitCheck | null | undefined,
  opts: { leadId?: number | string | null; hasSubmitActivity?: boolean } = {}
): boolean {
  if (!loanApp) return false;
  if (opts.leadId != null && !loanAppMatchesLeadId(loanApp, opts.leadId)) return false;
  if (opts.hasSubmitActivity === true) return false;
  if (loanApp.declarationAccepted !== true) return false;
  return hasMeaningfulFormData(loanApp.form_data);
}

/** Values to render in admin — masks stale prefill only; does not affect edit permissions. */
export function getAdminLoanFormDisplayData(
  loanApp: LoanAppSubmitCheck | null | undefined,
  opts: { leadId?: number | string | null; hasSubmitActivity?: boolean } = {}
): Record<string, Record<string, unknown>> | null | undefined {
  if (!loanApp) return null;
  if (opts.leadId != null && !loanAppMatchesLeadId(loanApp, opts.leadId)) return null;
  if (isStaleLoanFormPrefill(loanApp, opts)) return null;
  return (loanApp.form_data as Record<string, Record<string, unknown>> | null | undefined) ?? null;
}

export type AdminLoanFormContextOpts = {
  leadId?: number | string | null;
  hasSubmitActivity?: boolean;
};

/** Base for admin tick-save merges — same gating as display (excludes hidden stale prefill). */
export function getAdminLoanFormSaveBase(
  loanApp: LoanAppSubmitCheck | null | undefined,
  opts: AdminLoanFormContextOpts = {}
): Record<string, Record<string, unknown>> {
  return getAdminLoanFormDisplayData(loanApp, opts) ?? {};
}
