/** Failure / error codes for personal-loan-eligibility (doc §15). */

export const PlErr = {
  VALIDATION: 'PL_ERR_VALIDATION',
  LEAD_NOT_FOUND: 'PL_ERR_LEAD_NOT_FOUND',
  LOAN_APP_MISSING: 'PL_ERR_LOAN_APP_MISSING',
  BUREAU_SUMMARY_MISSING: 'PL_ERR_BUREAU_SUMMARY_MISSING',
  LENDER_NOT_FOUND: 'PL_ERR_LENDER_NOT_FOUND',
  INACTIVE_CATALOG: 'PL_ERR_INACTIVE_CATALOG',
  MISSING_CRITERIA: 'PL_ERR_MISSING_CRITERIA',
  CONN_LEAD: 'PL_ERR_CONN_LEAD',
  CONN_LOAN_APP: 'PL_ERR_CONN_LOAN_APP',
  CONN_BUREAU: 'PL_ERR_CONN_BUREAU',
  CONN_CATALOG: 'PL_ERR_CONN_CATALOG',
  CONN_CRITERIA: 'PL_ERR_CONN_CRITERIA',
  CONN_ZIP: 'PL_ERR_CONN_ZIP',
  INTERNAL: 'PL_ERR_INTERNAL',
} as const;

export const PlFail = {
  PRE_ACTIVE: 'PL_FAIL_PRE_ACTIVE',
  PINCODE: 'PL_FAIL_PINCODE',
  CIBIL: 'PL_FAIL_CIBIL',
  FTB: 'PL_FAIL_FTB',
  DPD_LATEST: 'PL_FAIL_DPD_LATEST',
  AGE: 'PL_FAIL_AGE',
  INCOME: 'PL_FAIL_INCOME',
  AMOUNT: 'PL_FAIL_AMOUNT',
  FOIR: 'PL_FAIL_FOIR',
  DPD_3M: 'PL_FAIL_DPD_3M',
  DPD_12M: 'PL_FAIL_DPD_12M',
  DPD_DAYS: 'PL_FAIL_DPD_DAYS',
  CC_UTIL: 'PL_FAIL_CC_UTIL',
  UNSECURED: 'PL_FAIL_UNSECURED',
  SALARY_TYPE: 'PL_FAIL_SALARY_TYPE',
  PF: 'PL_FAIL_PF',
  EMPLOYMENT: 'PL_FAIL_EMPLOYMENT',
  ENQ_EXCLUDE: 'PL_FAIL_ENQ_EXCLUDE',
  ENQ_1M: 'PL_FAIL_ENQ_1M',
  ENQ_3M: 'PL_FAIL_ENQ_3M',
  MISSING_APPLICANT_VALUE: 'PL_FAIL_MISSING_APPLICANT_VALUE',
} as const;

export type PlErrorCode = (typeof PlErr)[keyof typeof PlErr] | (typeof PlFail)[keyof typeof PlFail];

export class PlEligibilityError extends Error {
  code: PlErrorCode;
  httpStatus: number;
  details?: Record<string, unknown>;

  constructor(
    code: PlErrorCode,
    message: string,
    httpStatus = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PlEligibilityError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}
