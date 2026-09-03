import type {
  ApplicantProfile,
  LenderCriteria,
} from '../../personal-loan-eligibility/utils/types';
import type {
  BlApplicantProfile,
  BlLenderCriteria,
} from '../../business-loan-eligibility/utils/types';
import {
  scoreActiveUnsecured,
  scoreCcUtilization,
  scoreCibilScore,
  scoreDpdLast12m,
  scoreDpdLast3m,
  scoreEnquiries3m,
  scoreFoirCheck,
  scoreMaxLoanAdequacy,
  scoreRoiCompetitiveness,
} from '../../personal-loan-scoring-criteria/utils/scoring-rules';
import type { CriterionScoreResult as PlCriterionScoreResult } from '../../personal-loan-scoring-criteria/utils/types';
import { BlScoreErr } from './error-codes';
import type {
  BlScoreCriterionId,
  CriterionScoreResult,
  ScoringCatalogRow,
} from './types';

export function toPlApplicantProfile(bl: BlApplicantProfile): ApplicantProfile {
  const netMonthlyIncome =
    bl.annualTurnoverInr != null && bl.annualTurnoverInr > 0
      ? bl.annualTurnoverInr / 12
      : null;
  return {
    leadId: bl.leadId,
    fullName: bl.fullName,
    pinCode: bl.pinCode,
    requestedAmount: bl.requestedAmount,
    loanAmount: bl.loanAmount ?? bl.requestedAmount,
    netMonthlyIncome,
    hasOtherIncome: null,
    otherIncomeAmount: null,
    salaryMode: null,
    employmentMonths: null,
    dob: bl.dob,
    age: bl.age,
    cibilScore: bl.cibilScore,
    isFirstTimeBorrower: bl.isFirstTimeBorrower,
    pfDeducted: null,
    existingTotalEmi: bl.existingTotalEmi,
    tenureMonths: 0,
    paymentHistoryMonths: bl.paymentHistoryMonths,
    latestPaymentMonth: bl.latestPaymentMonth,
    maxDpdDays: bl.maxDpdDays,
    enquiries1m: bl.enquiries1m,
    enquiries3m: bl.enquiries3m,
    enquiryMembers: bl.enquiryMembers,
    ccOutstanding: bl.ccOutstanding,
    ccLimit: bl.ccLimit,
    ccUtil: bl.ccUtil,
    activeUnsecured: bl.activeUnsecured,
    hasBureau: bl.hasBureau,
  };
}

export function toPlLenderCriteria(bl: BlLenderCriteria): LenderCriteria {
  return {
    lenderCode: bl.lenderCode,
    isActive: bl.isActive,
    minCibil: bl.minCibil,
    firstTimeBorrowerAllowed: bl.firstTimeBorrowerAllowed,
    minInterestRate: bl.minInterestRate,
    maxInterestRate: bl.maxInterestRate,
    pincodeCheckRequired: false,
    foir: bl.foirMax ?? null,
    maxDpdDaysAllowed: bl.maxDpdDaysAllowed,
    minLoanAmount: bl.minLoanAmount,
    maxLoanAmount: bl.maxLoanAmount,
    pfRequired: false,
  };
}

function remapPlResult(result: PlCriterionScoreResult): CriterionScoreResult {
  const errorCode =
    typeof result.errorCode === 'string'
      ? result.errorCode.replace(/^PL_SCORE/, 'BL_SCORE')
      : result.errorCode ?? null;
  return {
    ...result,
    criterionId: result.criterionId as BlScoreCriterionId,
    errorCode,
  };
}

function skipResult(
  criterionId: BlScoreCriterionId,
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

export function scoreAnnualTurnover(
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'ANNUAL_TURNOVER';
  const weight = Number(catalog.weight);

  if (criteria.minAnnualTurnover == null) {
    return skipResult(
      criterionId,
      'FORMULA',
      weight,
      BlScoreErr.MISSING_MIN_ANNUAL_TURNOVER
    );
  }
  if (profile.annualTurnoverInr == null) {
    return skipResult(
      criterionId,
      'FORMULA',
      weight,
      BlScoreErr.MISSING_MIN_ANNUAL_TURNOVER
    );
  }

  const annualTurnoverInr = Number(profile.annualTurnoverInr);
  const threshold = Number(criteria.minAnnualTurnover);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return skipResult(
      criterionId,
      'FORMULA',
      weight,
      BlScoreErr.MISSING_MIN_ANNUAL_TURNOVER
    );
  }
  const points = Math.min(
    10,
    ((annualTurnoverInr - threshold) / (2 * threshold)) * 10
  );

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'FORMULA',
    weight,
    points,
    formula: `min(10, ((${annualTurnoverInr} - ${threshold}) / (2 * ${threshold})) * 10) = ${points}`,
    rules: null,
    applicant: {
      annualTurnoverInr,
      turnoverLakh: profile.turnoverLakh,
    },
    threshold: { minAnnualTurnover: threshold },
    concessionApplied: false,
  };
}

export function scoreBusinessVintage(
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const criterionId = 'BUSINESS_VINTAGE';
  const weight = Number(catalog.weight);

  if (criteria.minVintageYears == null) {
    return skipResult(
      criterionId,
      'FORMULA',
      weight,
      BlScoreErr.MISSING_MIN_VINTAGE_YEARS
    );
  }
  if (profile.businessVintageYears == null) {
    return skipResult(
      criterionId,
      'FORMULA',
      weight,
      BlScoreErr.MISSING_MIN_VINTAGE_YEARS
    );
  }

  const businessAgeYears = Number(profile.businessVintageYears);
  const threshold = Number(criteria.minVintageYears);
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return skipResult(
      criterionId,
      'FORMULA',
      weight,
      BlScoreErr.MISSING_MIN_VINTAGE_YEARS
    );
  }
  const points = Math.min(
    7,
    ((businessAgeYears - threshold) / (2 * threshold)) * 7
  );

  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'FORMULA',
    weight,
    points,
    formula: `min(7, ((${businessAgeYears} - ${threshold}) / (2 * ${threshold})) * 7) = ${points}`,
    rules: null,
    applicant: { businessAgeYears, businessVintageYears: businessAgeYears },
    threshold: { minVintageYears: threshold },
    concessionApplied: false,
  };
}

export function scoreStaticFullWeight(
  criterionId: 'ITR_DOCUMENTATION' | 'BUSINESS_REGISTRATION_PROOF',
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const weight = Number(catalog.weight);
  return {
    criterionId,
    phase: 'SCORING',
    result: 'SCORED',
    ruleType: 'STATIC',
    weight,
    points: weight,
    formula: 'points = weight',
    rules: null,
    concessionApplied: false,
  };
}

export function evaluateCriterion(
  criterionCode: BlScoreCriterionId,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria,
  catalog: ScoringCatalogRow
): CriterionScoreResult {
  const plProfile = toPlApplicantProfile(profile);
  const plCriteria = toPlLenderCriteria(criteria);
  const plCatalog = catalog as any;

  switch (criterionCode) {
    case 'CIBIL_SCORE':
      return remapPlResult(scoreCibilScore(plProfile, plCriteria, plCatalog));
    case 'FOIR_CHECK':
      return remapPlResult(scoreFoirCheck(plProfile, plCriteria, plCatalog));
    case 'DPD_LAST_3M':
      return remapPlResult(scoreDpdLast3m(plProfile, plCriteria, plCatalog));
    case 'DPD_LAST_12M':
      return remapPlResult(scoreDpdLast12m(plProfile, plCriteria, plCatalog));
    case 'CC_UTILIZATION':
      return remapPlResult(scoreCcUtilization(plProfile, plCatalog));
    case 'ACTIVE_UNSECURED':
      return remapPlResult(scoreActiveUnsecured(plProfile, plCatalog));
    case 'ENQUIRIES_3M':
      return remapPlResult(scoreEnquiries3m(plProfile, plCatalog));
    case 'ANNUAL_TURNOVER':
      return scoreAnnualTurnover(profile, criteria, catalog);
    case 'BUSINESS_VINTAGE':
      return scoreBusinessVintage(profile, criteria, catalog);
    case 'ITR_DOCUMENTATION':
      return scoreStaticFullWeight('ITR_DOCUMENTATION', catalog);
    case 'BUSINESS_REGISTRATION_PROOF':
      return scoreStaticFullWeight('BUSINESS_REGISTRATION_PROOF', catalog);
    case 'ROI_COMPETITIVENESS':
      return remapPlResult(scoreRoiCompetitiveness(plCriteria, plCatalog));
    case 'MAX_LOAN_ADEQUACY':
      return remapPlResult(scoreMaxLoanAdequacy(plProfile, plCriteria, plCatalog));
    default:
      return skipResult(
        criterionCode,
        'FORMULA',
        0,
        BlScoreErr.MISSING_WEIGHT_ROW
      );
  }
}
