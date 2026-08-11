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

export interface LenderCriteria {
  id?: number;
  lenderCode: string;
  isActive: boolean;
  minCibil?: number | null;
  firstTimeBorrowerAllowed: boolean;
  minInterestRate?: number | null;
  maxInterestRate?: number | null;
  pincodeCheckRequired: boolean;
  minAge?: number | null;
  maxAge?: number | null;
  minMonthlyIncome?: number | null;
  foir?: number | null;
  maxCCUtilizationRatio?: number | null;
  maxActiveUnsecuredAccount?: number | null;
  acceptedSalaryTypes?: string[] | null;
  pfRequired: boolean;
  minEmploymentMonths?: number | null;
  maxDpdDaysAllowed?: number | null;
  maxDpdCount3months?: number | null;
  maxDpdCount12months?: number | null;
  maxEnquiries1month?: number | null;
  maxEnquiries3months?: number | null;
  minLoanAmount?: number | null;
  maxLoanAmount?: number | null;
}

export interface CatalogLender {
  id: number;
  lenderCode: string;
  lenderName: string;
  lenderType?: string;
  isActive: boolean;
}

export interface ApplicantProfile {
  leadId: number;
  /** Lead display name for log file stems */
  fullName: string | null;
  pinCode: string | null;
  requestedAmount: number | null;
  /** From loan_application.loanAmount (MAX_LOAN_ADEQUACY scoring) */
  loanAmount: number | null;
  netMonthlyIncome: number | null;
  hasOtherIncome: boolean | null;
  otherIncomeAmount: number | null;
  salaryMode: string | null;
  employmentMonths: number | null;
  dob: string | null;
  age: number | null;
  cibilScore: number | null;
  isFirstTimeBorrower: boolean;
  pfDeducted: boolean | null;
  existingTotalEmi: number;
  tenureMonths: number;
  /** Unique calendar months from open_accounts payment_history (max DPD days per month), newest first. */
  paymentHistoryMonths: Array<{ monthKey: string; dpdDays: number }>;
  /** Newest month from paymentHistoryMonths (same rollup); null when no open-account history. */
  latestPaymentMonth: { monthKey: string; dpdDays: number } | null;
  maxDpdDays: number | null;
  enquiries1m: number;
  enquiries3m: number;
  /** Bureau enquiry member names within the last 3 months (for A1-ENQ-EXCLUDE). */
  enquiryMembers: string[];
  ccOutstanding: number;
  ccLimit: number;
  ccUtil: number | null;
  activeUnsecured: number | null;
  hasBureau: boolean;
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
  profile?: ApplicantProfile;
  lenders: LenderEvalResult[];
  scoring?: {
    leadId: number;
    runId: string;
    loanType: string;
    scored: Array<{ lenderCode: string; totalScore: number; lenderName?: string }>;
    rank: {
      minDisplayScore: number;
      displayed: Array<{ lenderCode: string; totalScore: number; rank: number | null }>;
      belowThreshold: Array<{ lenderCode: string; totalScore: number; errorCode?: string }>;
    };
  } | null;
  response: {
    eligible: Array<{ lenderCode: string; lenderName: string; lenderType?: string }>;
    excluded: Array<{
      lenderCode: string;
      lenderName: string;
      ruleFailures: string[];
      errorCodes: string[];
    }>;
  };
  connectionFailures: ConnectionFailure[];
  error?: { code: string; message: string } | null;
  validations: { ok: boolean; errors: Array<{ code: string; message: string }> };
}
