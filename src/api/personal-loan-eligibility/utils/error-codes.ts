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
  A1_14_PINCODE: 'PL_FAIL_A1_14_PINCODE',
  A1_01_CIBIL: 'PL_FAIL_A1_01_CIBIL',
  A1_FTB: 'PL_FAIL_A1_FTB',
  A1_02_AGE: 'PL_FAIL_A1_02_AGE',
  A1_03_INCOME: 'PL_FAIL_A1_03_INCOME',
  A1_13_AMOUNT: 'PL_FAIL_A1_13_AMOUNT',
  A1_15_FOIR: 'PL_FAIL_A1_15_FOIR',
  A1_07_DPD_3M: 'PL_FAIL_A1_07_DPD_3M',
  A1_08_DPD_12M: 'PL_FAIL_A1_08_DPD_12M',
  A1_09_DPD_DAYS: 'PL_FAIL_A1_09_DPD_DAYS',
  A1_16_CC_UTIL: 'PL_FAIL_A1_16_CC_UTIL',
  A1_UNSECURED: 'PL_FAIL_A1_UNSECURED',
  A1_04_SALARY_TYPE: 'PL_FAIL_A1_04_SALARY_TYPE',
  A1_05_PF: 'PL_FAIL_A1_05_PF',
  A1_06_EMPLOYMENT: 'PL_FAIL_A1_06_EMPLOYMENT',
  A1_ENQ_EXCLUDE: 'PL_FAIL_A1_ENQ_EXCLUDE',
  A1_11_ENQ_1M: 'PL_FAIL_A1_11_ENQ_1M',
  A1_12_ENQ_3M: 'PL_FAIL_A1_12_ENQ_3M',
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
