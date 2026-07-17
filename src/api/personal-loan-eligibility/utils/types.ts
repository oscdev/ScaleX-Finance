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
  typicalInterestRate?: number | null;
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
  maxDpdCount6months?: number | null;
  maxDpdCount12months?: number | null;
  maxEnquiries1month?: number | null;
  maxEnquiries3months?: number | null;
  minLoanAmount?: number | null;
  maxLoanAmount?: number | null;
  maxNewPersonalLoans6months?: number | null;
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
  pinCode: string | null;
  requestedAmount: number | null;
  netMonthlyIncome: number | null;
  salaryMode: string | null;
  employmentMonths: number | null;
  dob: string | null;
  age: number | null;
  cibilScore: number | null;
  isFirstTimeBorrower: boolean;
  pfDeducted: boolean | null;
  existingTotalEmi: number;
  proposedEmi: number | null;
  tenureMonths: number;
  dpdCount3m: number | null;
  dpdCount6m: number | null;
  dpdCount12m: number | null;
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
  lenders: LenderEvalResult[];
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
