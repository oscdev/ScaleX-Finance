/** Failure / error codes for business-loan-eligibility. */

export const BlErr = {
  VALIDATION: 'BL_ERR_VALIDATION',
  LEAD_NOT_FOUND: 'BL_ERR_LEAD_NOT_FOUND',
  LOAN_APP_MISSING: 'BL_ERR_LOAN_APP_MISSING',
  BUREAU_SUMMARY_MISSING: 'BL_ERR_BUREAU_SUMMARY_MISSING',
  LENDER_NOT_FOUND: 'BL_ERR_LENDER_NOT_FOUND',
  INACTIVE_CATALOG: 'BL_ERR_INACTIVE_CATALOG',
  MISSING_CRITERIA: 'BL_ERR_MISSING_CRITERIA',
  CONN_LEAD: 'BL_ERR_CONN_LEAD',
  CONN_LOAN_APP: 'BL_ERR_CONN_LOAN_APP',
  CONN_BUREAU: 'BL_ERR_CONN_BUREAU',
  CONN_CATALOG: 'BL_ERR_CONN_CATALOG',
  CONN_CRITERIA: 'BL_ERR_CONN_CRITERIA',
  CONN_ZIP: 'BL_ERR_CONN_ZIP',
  INTERNAL: 'BL_ERR_INTERNAL',
} as const;

export const BlFail = {
  PRE_ACTIVE: 'BL_FAIL_PRE_ACTIVE',
  PINCODE: 'BL_FAIL_PINCODE',
  CIBIL: 'BL_FAIL_CIBIL',
  FTB: 'BL_FAIL_FTB',
  CURRENT_OVERDUE: 'BL_FAIL_CURRENT_OVERDUE',
  AGE: 'BL_FAIL_AGE',
  ENTITY: 'BL_FAIL_ENTITY',
  TURNOVER: 'BL_FAIL_TURNOVER',
  VINTAGE: 'BL_FAIL_VINTAGE',
  AMOUNT: 'BL_FAIL_AMOUNT',
  FOIR: 'BL_FAIL_FOIR',
  CC_UTIL: 'BL_FAIL_CC_UTIL',
  DPD_3M: 'BL_FAIL_DPD_3M',
  DPD_12M: 'BL_FAIL_DPD_12M',
  DPD_DAYS: 'BL_FAIL_DPD_DAYS',
  UNSECURED: 'BL_FAIL_UNSECURED',
  ENQ_EXCLUDE: 'BL_FAIL_ENQ_EXCLUDE',
  ENQ_1M: 'BL_FAIL_ENQ_1M',
  ENQ_3M: 'BL_FAIL_ENQ_3M',
  AUDITED: 'BL_FAIL_AUDITED',
  SETTLED_WO: 'BL_FAIL_SETTLED_WO',
  MISSING_APPLICANT_VALUE: 'BL_FAIL_MISSING_APPLICANT_VALUE',
} as const;

export type BlErrorCode =
  | (typeof BlErr)[keyof typeof BlErr]
  | (typeof BlFail)[keyof typeof BlFail];

export class BlEligibilityError extends Error {
  code: BlErrorCode;
  httpStatus: number;
  details?: Record<string, unknown>;

  constructor(
    code: BlErrorCode,
    message: string,
    httpStatus = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BlEligibilityError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}
