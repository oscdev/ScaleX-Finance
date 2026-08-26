export type RuleResultStatus = 'PASS' | 'FAIL' | 'SKIP' | 'NOT_EVALUATED';

export interface ConditionResult {
  step: number;
  ruleId: string;
  ruleName?: string;
  formula?: string;
  applicantValue?: unknown;
  threshold?: Record<string, unknown> | null;
  result: RuleResultStatus;
  errorCode?: string | null;
  reason?: string | null;
  matchMode?: string;
  branchUsed?: 'CIBIL' | 'FTB';
  sources?: Record<string, string>;
}

export interface ConnectionFailure {
  code: string;
  target: string;
  table?: string;
  reason: string;
  step?: number;
  lenderCode?: string | null;
}

export interface BlLenderCriteria {
  id?: number;
  lenderCode: string;
  isActive: boolean;
  minCibil?: number | null;
  firstTimeBorrowerAllowed: boolean;
  maxAgeYears?: number | null;
  minAgeYears?: number | null;
  eligibleEntityTypes?: string[] | null;
  currentOverdue: boolean;
  settledWriteOff36Months: boolean;
  minCreditHistoryMonths?: number | null;
  minAnnualTurnover?: number | null;
  minVintageYears?: number | null;
  itrFilingYearsRequired?: number | null;
  gstMandatory: boolean;
  auditedBooksRequired: boolean;
  bankStatementMonthsRequired?: number | null;
  minLoanAmount?: number | null;
  maxLoanAmount?: number | null;
  foirMax?: number | null;
  maxCcUtilizationRatio?: number | null;
  maxActiveUnsecured6Months?: number | null;
  maxEnquiries1Month?: number | null;
  maxEnquiries3Months?: number | null;
  maxDpdCount3Months?: number | null;
  maxDpdCount12Months?: number | null;
  maxDpdDaysAllowed?: number | null;
}

export interface CatalogLender {
  id: number;
  lenderCode: string;
  lenderName: string;
  lenderType?: string;
  isActive: boolean;
}

export interface WriteOffAccount {
  paymentStartDate: string | null;
  writtenOffAmount: number;
  monthsSinceStart: number | null;
}

export interface BlApplicantProfile {
  leadId: number;
  fullName: string | null;
  pinCode: string | null;
  requestedAmount: number | null;
  loanAmount: number | null;
  loanType: string | null;
  applicationDate: Date | null;
  /** Form businessDetails.type */
  entityType: string | null;
  /** Form turnover in Lakh */
  turnoverLakh: number | null;
  /** turnoverLakh * 100000 */
  annualTurnoverInr: number | null;
  /** Form businessDetails.age (years) */
  businessVintageYears: number | null;
  auditedBooks: boolean | null;
  dob: string | null;
  age: number | null;
  cibilScore: number | null;
  isFirstTimeBorrower: boolean;
  existingTotalEmi: number;
  paymentHistoryMonths: Array<{ monthKey: string; dpdDays: number }>;
  latestPaymentMonth: { monthKey: string; dpdDays: number } | null;
  maxDpdDays: number | null;
  enquiries1m: number;
  enquiries3m: number;
  enquiryMembers: string[];
  ccOutstanding: number;
  ccLimit: number;
  ccUtil: number | null;
  activeUnsecured: number | null;
  writeOffAccounts: WriteOffAccount[];
  hasBureau: boolean;
  hasLoanApp: boolean;
}

export interface LenderEvalResult {
  lenderCode: string;
  lenderName: string;
  lenderType?: string;
  eligible: boolean;
  passed: string[];
  failed: string[];
  skipped: string[];
  notEvaluated: string[];
  conditions: ConditionResult[];
  errorCodes: string[];
}

export interface MatchRunResult {
  leadId: number;
  runId: string;
  loanType: string;
  profile?: BlApplicantProfile;
  lenders: LenderEvalResult[];
  response: {
    eligible: Array<{
      lenderCode: string;
      lenderName: string;
      lenderType?: string;
      eligible: boolean;
      ruleFailures: string[];
      passed: string[];
      failed: string[];
    }>;
    excluded: Array<{
      lenderCode: string;
      lenderName: string;
      eligible: boolean;
      failedAt?: string;
      failedStep?: number;
      errorCode?: string | null;
      ruleFailures: string[];
      errorCodes: string[];
    }>;
  };
  connectionFailures: ConnectionFailure[];
  error?: { code: string; message: string } | null;
  validations: { ok: boolean; errors: Array<{ code: string; message: string }> };
  logFile?: string | null;
}
