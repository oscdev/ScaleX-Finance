import type { ApplicantProfile, LenderCriteria } from '../../personal-loan-eligibility/utils/types';
import { PlScoreErr } from './error-codes';
import { pointsFromRulesMap } from './rules-map';
import type { CriterionScoreResult, ScoringCatalogRow, ScoreCriterionId } from './types';
import { CIBIL_CEILING, FOIR_DENOMINATOR } from './types';

export function isNewBorrowerForLender(
  profile: ApplicantProfile,
  criteria: LenderCriteria
): boolean {
  return profile.isFirstTimeBorrower && criteria.firstTimeBorrowerAllowed === true;
}

export function resolveTotalMonthlyIncome(profile: ApplicantProfile): number | null {
  if (profile.netMonthlyIncome == null) return null;
  const includeOther = profile.hasOtherIncome === true;
  const otherAmount = includeOther ? (profile.otherIncomeAmount ?? 0) : 0;
  return includeOther ? profile.netMonthlyIncome + otherAmount : profile.netMonthlyIncome;
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function countDpdViolations3m(
  paymentHistoryMonths: Array<{ monthKey: string; dpdDays: number }>,
  maxDpdDaysAllowed: number,
  asOf = new Date()
): number {
  const cut3 = new Date(asOf.getFullYear(), asOf.getMonth() - 2, 1);
  const cut3Key = monthKeyFromDate(cut3);
  return paymentHistoryMonths.filter(
    (m) => m.monthKey >= cut3Key && m.dpdDays > maxDpdDaysAllowed
  ).length;
}

export function countDpdViolations12m(
  paymentHistoryMonths: Array<{ monthKey: string; dpdDays: number }>,
  maxDpdDaysAllowed: number,
  asOf = new Date()
): number {
  const cut12 = new Date(asOf.getFullYear(), asOf.getMonth() - 11, 1);
  const cut12Key = monthKeyFromDate(cut12);
  return paymentHistoryMonths.filter(
    (m) => m.monthKey >= cut12Key && m.dpdDays > maxDpdDaysAllowed
  ).length;
}

function skipResult(
  criterionId: ScoreCriterionId,
  ruleType: CriterionScoreResult['ruleType'],
  weight: number,
  errorCode: string
): CriterionScoreResult {
  return {
    criterionId,
    phase: 'SCORING',
    result: 'SKIP',
    ruleType,
    weight,
    points: 0,
    errorCode,
    rules: null,
  };
}

export function scoreCibilScore(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'CIBIL_SCORE';
  const weight = Number(catalog.weight);
  const minCibil = criteria.minCibil;

  if (minCibil == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_MIN_CIBIL);
  }
  if (minCibil >= CIBIL_CEILING) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.DIV_BY_ZERO);
  }

  if (isNewBorrowerForLender(profile, criteria)) {
    return {
      criterionId,
      phase: 'SCORING',
      result: 'SCORED',
      ruleType: 'FORMULA',
      weight,
      points: weight,
      formula: 'newBorrower → full weight',
      rules: null,
      applicant: profile.cibilScore,
      threshold: { minCibil },
      concessionApplied: true,
    };
  }

  const cibil = profile.cibilScore;
  if (cibil == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_MIN_CIBIL);
  }

  const ratio = (cibil - minCibil) / (CIBIL_CEILING - minCibil);
  const cappedRatio = Math.min(1, Math.max(0, ratio));
  const points = cappedRatio * weight;

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'FORMULA',
    weight,
    points,
    formula: `(${cibil}-${minCibil})/(${CIBIL_CEILING}-${minCibil})*${weight} = ${points}`,
    rules: null,
    applicant: cibil,
    threshold: { minCibil },
    concessionApplied: false,
  };
}

export function scoreFoirCheck(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'FOIR_CHECK';
  const weight = Number(catalog.weight);

  if (criteria.foir == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_FOIR);
  }
  if (profile.netMonthlyIncome == null || profile.netMonthlyIncome <= 0) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_FOIR);
  }

  const foirApplicant = profile.existingTotalEmi / profile.netMonthlyIncome;
  const points = weight * (1 - (foirApplicant * 100) / FOIR_DENOMINATOR);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'FORMULA',
    weight,
    points,
    formula: `${weight} * (1 - (${(foirApplicant * 100).toFixed(2)}/${FOIR_DENOMINATOR})) = ${points}`,
    rules: null,
    applicant: {
      foirApplicant,
      existingTotalEmi: profile.existingTotalEmi,
      netMonthlyIncome: profile.netMonthlyIncome,
    },
    threshold: { foir: criteria.foir },
    concessionApplied: false,
  };
}

export function scoreDpdLast3m(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'DPD_LAST_3M';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (criteria.maxDpdDaysAllowed == null) {
    return skipResult(criterionId, 'JSON', weight, PlScoreErr.MISSING_MAX_DPD_DAYS_ALLOWED);
  }

  const months = profile.paymentHistoryMonths || [];
  const n = countDpdViolations3m(months, Number(criteria.maxDpdDaysAllowed));
  const { points, matchedKey } = pointsFromRulesMap(n, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON',
    weight,
    points,
    formula: 'pointsFromRulesMap(dpdViolationCount3Months)',
    rules,
    matchedKey,
    applicant: { dpdViolationCount3Months: n, maxDpdDays: profile.maxDpdDays },
    threshold: { maxDpdDaysAllowed: criteria.maxDpdDaysAllowed },
    concessionApplied: months.length === 0,
  };
}

export function scoreDpdLast12m(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'DPD_LAST_12M';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (criteria.maxDpdDaysAllowed == null) {
    return skipResult(criterionId, 'JSON', weight, PlScoreErr.MISSING_MAX_DPD_DAYS_ALLOWED);
  }

  const months = profile.paymentHistoryMonths || [];
  const n = countDpdViolations12m(months, Number(criteria.maxDpdDaysAllowed));
  const { points, matchedKey } = pointsFromRulesMap(n, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON',
    weight,
    points,
    formula: 'pointsFromRulesMap(dpdViolationCount12Months)',
    rules,
    matchedKey,
    applicant: { dpdViolationCount12Months: n, maxDpdDays: profile.maxDpdDays },
    threshold: { maxDpdDaysAllowed: criteria.maxDpdDaysAllowed },
    concessionApplied: months.length === 0,
  };
}

export function scoreCcUtilization(
  profile: ApplicantProfile,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'CC_UTILIZATION';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (profile.ccLimit <= 0 && profile.ccOutstanding <= 0) {
    return {
      criterionId,
      phase: 'SCORING',
      result: 'SCORED',
      ruleType: 'JSON',
      weight,
      points: 5,
      formula: 'no CC accounts → 0% → 5',
      rules,
      applicant: { ccOutstanding: 0, ccLimit: 0, ccUtil: null, ccUtilPct: 0 },
      concessionApplied: true,
    };
  }

  if (profile.ccLimit <= 0) {
    return skipResult(criterionId, 'JSON', weight, PlScoreErr.MISSING_CC_LIMIT);
  }

  const ccUtil = profile.ccUtil ?? profile.ccOutstanding / profile.ccLimit;
  const ccUtilPct = ccUtil * 100;
  const { points, matchedKey } = pointsFromRulesMap(ccUtilPct, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON',
    weight,
    points,
    formula: 'pointsFromRulesMap(ccUtilPct)',
    rules,
    matchedKey,
    applicant: {
      ccOutstanding: profile.ccOutstanding,
      ccLimit: profile.ccLimit,
      ccUtil,
      ccUtilPct,
    },
    concessionApplied: false,
  };
}

export function scoreActiveUnsecured(
  profile: ApplicantProfile,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'ACTIVE_UNSECURED';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (profile.activeUnsecured == null) {
    return skipResult(criterionId, 'JSON', weight, PlScoreErr.MISSING_ACTIVE_UNSECURED);
  }

  const n = profile.activeUnsecured;
  const { points, matchedKey } = pointsFromRulesMap(n, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON',
    weight,
    points,
    formula: 'pointsFromRulesMap(activeUnsecured)',
    rules,
    matchedKey,
    applicant: { activeUnsecured: n },
    concessionApplied: n === 0,
  };
}

export function scoreEnquiries3m(
  profile: ApplicantProfile,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'ENQUIRIES_3M';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (profile.enquiries3m == null) {
    return skipResult(criterionId, 'JSON', weight, PlScoreErr.MISSING_ENQUIRIES_3M);
  }

  const n = profile.enquiries3m;
  const { points, matchedKey } = pointsFromRulesMap(n, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON',
    weight,
    points,
    formula: 'pointsFromRulesMap(enquiries3m)',
    rules,
    matchedKey,
    applicant: { enquiries3m: n },
    concessionApplied: n === 0,
  };
}

export function scoreMonthlyIncome(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'MONTHLY_INCOME';
  const weight = Number(catalog.weight);

  if (criteria.minMonthlyIncome == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_MIN_MONTHLY_INCOME);
  }

  const monthlyIncome = resolveTotalMonthlyIncome(profile);
  if (monthlyIncome == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_MIN_MONTHLY_INCOME);
  }

  const threshold = Number(criteria.minMonthlyIncome);
  const points = Math.min(10, ((monthlyIncome - threshold) / (2 * threshold)) * 10);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'FORMULA',
    weight,
    points,
    formula: `min(10, ((${monthlyIncome} - ${threshold}) / (2 * ${threshold})) * 10) = ${points}`,
    rules: null,
    applicant: {
      netSalary: profile.netMonthlyIncome,
      hasOtherIncome: profile.hasOtherIncome,
      otherIncomeAmount: profile.otherIncomeAmount,
      monthlyIncome,
      totalMonthlyIncome: monthlyIncome,
    },
    threshold: { monthlyThreshold: threshold, minMonthlyIncome: threshold },
    concessionApplied: false,
  };
}

export function scoreJobExperience(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'JOB_EXPERIENCE';
  const weight = Number(catalog.weight);

  if (criteria.minEmploymentMonths == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_MIN_EMPLOYMENT_MONTHS);
  }
  if (profile.employmentMonths == null) {
    return skipResult(criterionId, 'FORMULA', weight, PlScoreErr.MISSING_MIN_EMPLOYMENT_MONTHS);
  }

  const expMonths = profile.employmentMonths;
  const threshold = Number(criteria.minEmploymentMonths);
  const points = Math.min(7, ((expMonths - threshold) / (2 * threshold)) * 7);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'FORMULA',
    weight,
    points,
    formula: `min(7, ((${expMonths} - ${threshold}) / (2 * ${threshold})) * 7) = ${points}`,
    rules: null,
    applicant: { expMonths, employmentMonths: expMonths },
    threshold: { requiredExperienceMonths: threshold, minEmploymentMonths: threshold },
    concessionApplied: false,
  };
}

export function scoreRoiCompetitiveness(
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'ROI_COMPETITIVENESS';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (criteria.minInterestRate == null) {
    return skipResult(criterionId, 'JSON', weight, PlScoreErr.MISSING_MIN_INTEREST_RATE);
  }

  const rate = Number(criteria.minInterestRate);
  const { points, matchedKey } = pointsFromRulesMap(rate, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON',
    weight,
    points,
    formula: 'pointsFromRulesMap(minInterestRate)',
    rules,
    matchedKey,
    applicant: { minInterestRate: rate },
    threshold: { bands: rules },
    concessionApplied: false,
  };
}

export function scoreMaxLoanAdequacy(
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'MAX_LOAN_ADEQUACY';
  const weight = Number(catalog.weight);
  const rules = catalog.rules!;

  if (profile.loanAmount == null) {
    return skipResult(criterionId, 'JSON+FORMULA', weight, PlScoreErr.MISSING_LOAN_AMOUNT);
  }
  if (criteria.maxLoanAmount == null || Number(criteria.maxLoanAmount) <= 0) {
    return skipResult(criterionId, 'JSON+FORMULA', weight, PlScoreErr.MISSING_MAX_LOAN_AMOUNT);
  }

  const loanAmount = Number(profile.loanAmount);
  const maxLoanAmount = Number(criteria.maxLoanAmount);
  const ratioPct = (loanAmount / maxLoanAmount) * 100;
  const { points, matchedKey } = pointsFromRulesMap(ratioPct, rules);

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'JSON+FORMULA',
    weight,
    points,
    formula: `ratioPct=(${loanAmount}/${maxLoanAmount})*100=${ratioPct.toFixed(2)}; then rules`,
    rules,
    matchedKey,
    applicant: { loanAmount, maxLoanAmount, ratioPct },
    concessionApplied: false,
  };
}

export function evaluateCriterion(
  criterionCode: ScoreCriterionId,
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  switch (criterionCode) {
    case 'CIBIL_SCORE':
      return scoreCibilScore(profile, criteria, catalog);
    case 'FOIR_CHECK':
      return scoreFoirCheck(profile, criteria, catalog);
    case 'DPD_LAST_3M':
      return scoreDpdLast3m(profile, criteria, catalog);
    case 'DPD_LAST_12M':
      return scoreDpdLast12m(profile, criteria, catalog);
    case 'CC_UTILIZATION':
      return scoreCcUtilization(profile, catalog);
    case 'ACTIVE_UNSECURED':
      return scoreActiveUnsecured(profile, catalog);
    case 'ENQUIRIES_3M':
      return scoreEnquiries3m(profile, catalog);
    case 'MONTHLY_INCOME':
      return scoreMonthlyIncome(profile, criteria, catalog);
    case 'JOB_EXPERIENCE':
      return scoreJobExperience(profile, criteria, catalog);
    case 'ROI_COMPETITIVENESS':
      return scoreRoiCompetitiveness(criteria, catalog);
    case 'MAX_LOAN_ADEQUACY':
      return scoreMaxLoanAdequacy(profile, criteria, catalog);
    default:
      return skipResult(criterionCode as ScoreCriterionId, 'FORMULA', 0, PlScoreErr.MISSING_WEIGHT_ROW);
  }
}
