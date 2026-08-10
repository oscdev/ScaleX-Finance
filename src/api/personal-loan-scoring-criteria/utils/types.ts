export type ScoreCriterionId =
  | 'CIBIL_SCORE'
  | 'FOIR_CHECK'
  | 'DPD_LAST_3M'
  | 'DPD_LAST_12M'
  | 'CC_UTILIZATION'
  | 'ACTIVE_UNSECURED'
  | 'ENQUIRIES_3M'
  | 'MONTHLY_INCOME'
  | 'JOB_EXPERIENCE'
  | 'ROI_COMPETITIVENESS'
  | 'MAX_LOAN_ADEQUACY';

export type ScoringPhase = 'SCORING';
export type CriterionResult = 'SCORED' | 'SKIP';
export type RuleType = 'FORMULA' | 'JSON' | 'JSON+FORMULA' | 'STATIC';

export interface ScoringCatalogRow {
  id?: number;
  criterionCode: ScoreCriterionId;
  criterionName: string;
  category: string;
  loanType: string;
  weight: number;
  ruleType: RuleType;
  rules: Record<string, number> | null;
  isActive: boolean;
}

export interface CriterionScoreResult {
  criterionId: ScoreCriterionId;
  phase: ScoringPhase;
  result: CriterionResult;
  ruleType?: RuleType;
  weight: number;
  points: number;
  formula?: string;
  rules?: Record<string, number> | null;
  matchedKey?: string | null;
  applicant?: unknown;
  threshold?: unknown;
  errorCode?: string | null;
  concessionApplied?: boolean;
}

export interface LenderScoreResult {
  leadId: number;
  lenderCode: string;
  lenderName?: string;
  lenderType?: string;
  totalScore: number;
  criteria: CriterionScoreResult[];
  excludedByHardReject: boolean;
  minInterestRate?: number | null;
  summary: {
    criterionScores: Partial<Record<ScoreCriterionId, number>>;
    scoringSkipped: ScoreCriterionId[];
    totalScore: number;
  };
}

export interface RankedLender extends LenderScoreResult {
  rank: number | null;
  displayed: boolean;
  errorCode?: string | null;
}

export interface RankResult {
  leadId: number;
  phase: 'RANK';
  minDisplayScore: number;
  formula: string;
  displayed: RankedLender[];
  belowThreshold: RankedLender[];
  eliminated: Array<{
    lenderCode: string;
    excludedByHardReject: boolean;
    criterionId?: string;
    errorCode?: string;
  }>;
}

export interface ScoringRunResult {
  leadId: number;
  runId: string;
  loanType: string;
  scored: LenderScoreResult[];
  rank: RankResult;
}

export const MIN_DISPLAY_SCORE = 40;
export const CIBIL_CEILING = 900;
export const FOIR_DENOMINATOR = 80;
