/** Loan-application media fields synced to api_uploads (public form + admin CM). */
export const LOAN_APP_MEDIA_FIELDS = [
  'panCard',
  'cibilReport',
  'aadharCardFront',
  'aadharCardBack',
  'proprietorshipDoc',
  'businessRegProofDoc',
  'bankStatement',
  'salarySlips',
  'coAppPan',
  'coAppAadharFront',
  'coAppAadharBack',
  'propertyPapers',
  'otherDocs',
  'itrYear1',
  'itrYear2',
  'itrYear3',
  'auditedBooksDoc',
] as const;

export type LoanAppMediaField = (typeof LOAN_APP_MEDIA_FIELDS)[number];
