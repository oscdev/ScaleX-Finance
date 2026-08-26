import { BlFail } from './error-codes';
import type {
  BlApplicantProfile,
  BlLenderCriteria,
  CatalogLender,
  ConditionResult,
} from './types';

function skip(
  step: number,
  ruleId: string,
  ruleName: string,
  formula: string,
  threshold: any
): ConditionResult {
  return {
    step,
    ruleId,
    ruleName,
    formula,
    threshold,
    result: 'SKIP',
    errorCode: null,
    reason: 'Null threshold — rule not applied',
  };
}

export function notEvaluated(step: number, ruleId: string, priorFail: string): ConditionResult {
  return {
    step,
    ruleId,
    result: 'NOT_EVALUATED',
    errorCode: null,
    reason: `priorFail: ${priorFail}`,
  };
}

function missingFail(
  step: number,
  ruleId: string,
  ruleName: string,
  formula: string,
  threshold: any
): ConditionResult {
  return {
    step,
    ruleId,
    ruleName,
    formula,
    threshold,
    applicantValue: null,
    result: 'FAIL',
    errorCode: BlFail.MISSING_APPLICANT_VALUE,
    reason: 'Applicant value missing for required threshold',
  };
}

export function evaluateActive(
  step: number,
  catalog: CatalogLender | null,
  criteria: BlLenderCriteria | null
): ConditionResult {
  const formula = 'catalog.isActive && criteria.isActive && criteriaExists';
  if (!catalog || !catalog.isActive) {
    return {
      step,
      ruleId: 'BL-PRE-ACTIVE',
      ruleName: 'Lender + criteria active',
      formula,
      threshold: { catalogIsActive: catalog?.isActive ?? false },
      result: 'FAIL',
      errorCode: BlFail.PRE_ACTIVE,
      reason: 'Catalog inactive or missing',
    };
  }
  if (!criteria || !criteria.isActive) {
    return {
      step,
      ruleId: 'BL-PRE-ACTIVE',
      ruleName: 'Lender + criteria active',
      formula,
      threshold: { criteriaIsActive: criteria?.isActive ?? false },
      result: 'FAIL',
      errorCode: BlFail.PRE_ACTIVE,
      reason: 'Criteria inactive or missing',
    };
  }
  return {
    step,
    ruleId: 'BL-PRE-ACTIVE',
    ruleName: 'Lender + criteria active',
    formula,
    threshold: { catalogIsActive: true, criteriaIsActive: true },
    result: 'PASS',
    errorCode: null,
  };
}

/** Always evaluate geography — no pincodeCheckRequired; FAIL if no pin or no match. */
export function evaluateZipcode(
  step: number,
  profile: BlApplicantProfile,
  _criteria: BlLenderCriteria,
  zipRows: Array<{ zipCode?: string | null; coversAllPincodes?: boolean; isActive?: boolean }>
): ConditionResult {
  const formula = 'coversAllPincodes OR zipCode === applicantPin';
  const threshold = { geographyAlwaysEvaluated: true };

  if (!profile.pinCode) {
    return missingFail(step, 'BL-PINCODE', 'Zip / pincode coverage', formula, threshold);
  }

  const active = (zipRows || []).filter((z) => z.isActive !== false);
  const all = active.find((z) => z.coversAllPincodes === true);
  if (all) {
    return {
      step,
      ruleId: 'BL-PINCODE',
      ruleName: 'Zip / pincode coverage',
      formula,
      threshold,
      applicantValue: profile.pinCode,
      result: 'PASS',
      matchMode: 'ALL',
      errorCode: null,
    };
  }

  const pin = String(profile.pinCode).trim();
  const match = active.find((z) => z.zipCode != null && String(z.zipCode).trim() === pin);
  if (match) {
    return {
      step,
      ruleId: 'BL-PINCODE',
      ruleName: 'Zip / pincode coverage',
      formula,
      threshold,
      applicantValue: profile.pinCode,
      result: 'PASS',
      matchMode: 'PIN_MATCH',
      errorCode: null,
    };
  }

  return {
    step,
    ruleId: 'BL-PINCODE',
    ruleName: 'Zip / pincode coverage',
    formula,
    threshold,
    applicantValue: profile.pinCode,
    result: 'FAIL',
    matchMode: 'NO_MATCH',
    errorCode: BlFail.PINCODE,
    reason: 'Applicant pin not in lender serviceable zip set',
  };
}

export function evaluateCibilOrFtb(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  if (profile.isFirstTimeBorrower) {
    const formula = 'firstTimeBorrowerAllowed === true';
    const ok = criteria.firstTimeBorrowerAllowed === true;
    return {
      step,
      ruleId: 'BL-FTB',
      ruleName: 'First-time borrower',
      formula,
      branchUsed: 'FTB',
      applicantValue: true,
      threshold: { firstTimeBorrowerAllowed: criteria.firstTimeBorrowerAllowed },
      result: ok ? 'PASS' : 'FAIL',
      errorCode: ok ? null : BlFail.FTB,
      reason: ok ? null : 'First-time borrower not allowed for this lender',
    };
  }
  const formula = 'applicantCibil >= minCibil';
  if (criteria.minCibil == null) {
    return skip(step, 'BL-CIBIL', 'Min CIBIL', formula, { minCibil: null });
  }
  if (profile.cibilScore == null) {
    return {
      ...missingFail(step, 'BL-CIBIL', 'Min CIBIL', formula, { minCibil: criteria.minCibil }),
      branchUsed: 'CIBIL',
    };
  }
  const ok = profile.cibilScore >= criteria.minCibil;
  return {
    step,
    ruleId: 'BL-CIBIL',
    ruleName: 'Min CIBIL',
    formula,
    branchUsed: 'CIBIL',
    applicantValue: profile.cibilScore,
    threshold: { minCibil: criteria.minCibil },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.CIBIL,
    reason: ok ? null : 'CIBIL below lender minimum',
  };
}

/**
 * currentOverdue===true → PASS (overdue accepted).
 * false → latestDpdDays <= 5; SKIP if no latest month.
 */
export function evaluateCurrentOverdue(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula =
    'currentOverdue=true → PASS; currentOverdue=false → latestDpdDays <= 5';
  const threshold = { currentOverdue: criteria.currentOverdue };

  if (criteria.currentOverdue === true) {
    return {
      step,
      ruleId: 'BL-CURRENT-OVERDUE',
      ruleName: 'Current overdue',
      formula,
      applicantValue: profile.latestPaymentMonth,
      threshold,
      result: 'PASS',
      errorCode: null,
      reason: 'current_overdue=true — overdue accepted',
    };
  }

  const latest = profile.latestPaymentMonth;
  if (!latest) {
    return {
      step,
      ruleId: 'BL-CURRENT-OVERDUE',
      ruleName: 'Current overdue',
      formula,
      applicantValue: { monthKey: null, latestDpdDays: null },
      threshold,
      result: 'SKIP',
      errorCode: null,
      reason: 'current_overdue=false and no payment history',
    };
  }

  const ok = latest.dpdDays <= 5;
  return {
    step,
    ruleId: 'BL-CURRENT-OVERDUE',
    ruleName: 'Current overdue',
    formula,
    applicantValue: {
      monthKey: latest.monthKey,
      latestDpdDays: latest.dpdDays,
      compare: `${latest.dpdDays} <= 5`,
    },
    threshold,
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.CURRENT_OVERDUE,
    reason: ok
      ? null
      : `Latest open-account DPD ${latest.dpdDays} days (${latest.monthKey}) exceeds hard cap of 5`,
  };
}

export function evaluateAge(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = 'minAgeYears <= age <= maxAgeYears';
  if (criteria.minAgeYears == null && criteria.maxAgeYears == null) {
    return skip(step, 'BL-AGE', 'Age band', formula, {
      minAgeYears: null,
      maxAgeYears: null,
    });
  }
  if (profile.age == null) {
    return missingFail(step, 'BL-AGE', 'Age band', formula, {
      minAgeYears: criteria.minAgeYears,
      maxAgeYears: criteria.maxAgeYears,
    });
  }
  const geMin = criteria.minAgeYears == null || profile.age >= criteria.minAgeYears;
  const leMax = criteria.maxAgeYears == null || profile.age <= criteria.maxAgeYears;
  const ok = geMin && leMax;
  return {
    step,
    ruleId: 'BL-AGE',
    ruleName: 'Age band',
    formula,
    applicantValue: profile.age,
    threshold: { minAgeYears: criteria.minAgeYears, maxAgeYears: criteria.maxAgeYears },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.AGE,
    reason: ok ? null : 'Age outside lender band',
  };
}

export function evaluateEntity(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = 'entityType IN eligibleEntityTypes';
  const list = criteria.eligibleEntityTypes;
  if (!list || !Array.isArray(list) || list.length === 0) {
    return skip(step, 'BL-ENTITY', 'Eligible entity type', formula, {
      eligibleEntityTypes: list ?? null,
    });
  }
  if (!profile.entityType) {
    return missingFail(step, 'BL-ENTITY', 'Eligible entity type', formula, {
      eligibleEntityTypes: list,
    });
  }
  const ok = list.some((s) => String(s) === profile.entityType);
  return {
    step,
    ruleId: 'BL-ENTITY',
    ruleName: 'Eligible entity type',
    formula,
    applicantValue: profile.entityType,
    threshold: { eligibleEntityTypes: list },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.ENTITY,
    reason: ok ? null : 'Entity type not in lender allow-list',
  };
}

export function evaluateTurnover(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = 'annualTurnoverInr >= minAnnualTurnover';
  if (criteria.minAnnualTurnover == null) {
    return skip(step, 'BL-TURNOVER', 'Min annual turnover', formula, {
      minAnnualTurnover: null,
    });
  }
  if (profile.annualTurnoverInr == null) {
    return missingFail(step, 'BL-TURNOVER', 'Min annual turnover', formula, {
      minAnnualTurnover: criteria.minAnnualTurnover,
    });
  }
  const ok = profile.annualTurnoverInr >= Number(criteria.minAnnualTurnover);
  return {
    step,
    ruleId: 'BL-TURNOVER',
    ruleName: 'Min annual turnover',
    formula,
    applicantValue: {
      turnoverLakh: profile.turnoverLakh,
      annualTurnoverInr: profile.annualTurnoverInr,
    },
    threshold: { minAnnualTurnover: criteria.minAnnualTurnover },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.TURNOVER,
    reason: ok ? null : 'Annual turnover below lender minimum',
  };
}

export function evaluateVintage(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = 'businessVintageYears >= minVintageYears';
  if (criteria.minVintageYears == null) {
    return skip(step, 'BL-VINTAGE', 'Min vintage', formula, { minVintageYears: null });
  }
  if (profile.businessVintageYears == null) {
    return missingFail(step, 'BL-VINTAGE', 'Min vintage', formula, {
      minVintageYears: criteria.minVintageYears,
    });
  }
  const ok = profile.businessVintageYears >= Number(criteria.minVintageYears);
  return {
    step,
    ruleId: 'BL-VINTAGE',
    ruleName: 'Min vintage',
    formula,
    applicantValue: profile.businessVintageYears,
    threshold: { minVintageYears: criteria.minVintageYears },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.VINTAGE,
    reason: ok ? null : 'Business vintage below lender minimum',
  };
}

export function evaluateLoanAmount(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = 'minLoanAmount <= loanAmount <= maxLoanAmount';
  if (criteria.minLoanAmount == null && criteria.maxLoanAmount == null) {
    return skip(step, 'BL-AMOUNT', 'Loan amount band', formula, {
      minLoanAmount: null,
      maxLoanAmount: null,
    });
  }
  if (profile.loanAmount == null) {
    return missingFail(step, 'BL-AMOUNT', 'Loan amount band', formula, {
      minLoanAmount: criteria.minLoanAmount,
      maxLoanAmount: criteria.maxLoanAmount,
    });
  }
  const geMin =
    criteria.minLoanAmount == null || profile.loanAmount >= Number(criteria.minLoanAmount);
  const leMax =
    criteria.maxLoanAmount == null || profile.loanAmount <= Number(criteria.maxLoanAmount);
  const ok = geMin && leMax;
  return {
    step,
    ruleId: 'BL-AMOUNT',
    ruleName: 'Loan amount band',
    formula,
    applicantValue: profile.loanAmount,
    threshold: {
      minLoanAmount: criteria.minLoanAmount,
      maxLoanAmount: criteria.maxLoanAmount,
    },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.AMOUNT,
    reason: ok ? null : 'Loan amount outside lender band',
  };
}

export function evaluateFoir(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = '(existingTotalEmi * 12) / annualTurnoverInr <= foirMax';
  if (criteria.foirMax == null) {
    return skip(step, 'BL-FOIR', 'FOIR max', formula, { foirMax: null });
  }
  if (profile.annualTurnoverInr == null || profile.annualTurnoverInr <= 0) {
    return {
      step,
      ruleId: 'BL-FOIR',
      ruleName: 'FOIR max',
      formula,
      applicantValue: {
        annualTurnoverInr: profile.annualTurnoverInr,
        existingTotalEmi: profile.existingTotalEmi,
      },
      threshold: { foirMax: criteria.foirMax },
      result: 'FAIL',
      errorCode: BlFail.FOIR,
      reason: 'Missing or zero annual turnover for FOIR',
    };
  }
  const applicantFoir = (profile.existingTotalEmi * 12) / profile.annualTurnoverInr;
  const ok = applicantFoir <= Number(criteria.foirMax);
  return {
    step,
    ruleId: 'BL-FOIR',
    ruleName: 'FOIR max',
    formula,
    applicantValue: {
      applicantFoir,
      existingTotalEmi: profile.existingTotalEmi,
      annualTurnoverInr: profile.annualTurnoverInr,
    },
    threshold: { foirMax: criteria.foirMax },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.FOIR,
    reason: ok ? null : 'FOIR exceeds lender maximum',
  };
}

export function evaluateCcu(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula =
    'ccOutstanding / ccLimit <= maxCcUtilizationRatio (per CC: credit_limit - current_balance)';
  if (criteria.maxCcUtilizationRatio == null) {
    return skip(step, 'BL-CC-UTIL', 'CCU max', formula, {
      maxCcUtilizationRatio: null,
    });
  }
  if (profile.ccLimit <= 0) {
    return {
      step,
      ruleId: 'BL-CC-UTIL',
      ruleName: 'CCU max',
      formula,
      applicantValue: {
        ccOutstanding: profile.ccOutstanding,
        ccLimit: profile.ccLimit,
      },
      threshold: { maxCcUtilizationRatio: criteria.maxCcUtilizationRatio },
      result: 'FAIL',
      errorCode: BlFail.CC_UTIL,
      reason: 'ccLimit <= 0',
    };
  }
  const util = profile.ccUtil ?? profile.ccOutstanding / profile.ccLimit;
  const ok = util <= Number(criteria.maxCcUtilizationRatio);
  return {
    step,
    ruleId: 'BL-CC-UTIL',
    ruleName: 'CCU max',
    formula,
    applicantValue: {
      ccOutstanding: profile.ccOutstanding,
      ccLimit: profile.ccLimit,
      ccUtil: util,
    },
    threshold: { maxCcUtilizationRatio: criteria.maxCcUtilizationRatio },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.CC_UTIL,
    reason: ok ? null : 'CC utilization above lender maximum',
  };
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function evaluateDpd(
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult[] {
  const results: ConditionResult[] = [];
  const events = profile.paymentHistoryMonths || [];
  const allowedDpd = criteria.maxDpdDaysAllowed;
  const asOf = profile.applicationDate || new Date();
  const cut3Key = monthKeyFromDate(new Date(asOf.getFullYear(), asOf.getMonth() - 2, 1));
  const cut12Key = monthKeyFromDate(new Date(asOf.getFullYear(), asOf.getMonth() - 11, 1));

  const eventsInWindow = (cutKey: string) => events.filter((m) => m.monthKey >= cutKey);

  const countViolations = (
    windowEvents: Array<{ monthKey: string; dpdDays: number }>,
    allowed: number
  ) => windowEvents.filter((m) => m.dpdDays > allowed).length;

  const pushCountRule = (
    step: number,
    ruleId: string,
    ruleName: string,
    failCode: string,
    windowLabel: string,
    cutKey: string,
    maxCount: number | null | undefined
  ) => {
    const windowEvents = eventsInWindow(cutKey);
    const paymentHistoryConsidered = windowEvents.map((m) => m.dpdDays);

    if (allowedDpd == null) {
      results.push({
        step,
        ruleId,
        ruleName,
        formula: 'SKIP -> max_dpd_days_allowed is null',
        applicantValue: {
          allowedDpd: null,
          paymentHistoryConsidered,
          dpdViolationCount: null,
        },
        threshold: { maxDpdDaysAllowed: null, maxCount: maxCount ?? null },
        result: 'SKIP',
        errorCode: null,
        reason: 'max_dpd_days_allowed is null — cannot count DPD violations',
      });
      return;
    }

    if (maxCount == null) {
      results.push({
        step,
        ruleId,
        ruleName,
        formula: `SKIP -> ${ruleId} max count is null`,
        applicantValue: {
          allowedDpd,
          paymentHistoryConsidered,
          dpdViolationCount: null,
        },
        threshold: { maxDpdDaysAllowed: allowedDpd, maxCount: null },
        result: 'SKIP',
        errorCode: null,
        reason: 'Null threshold — rule not applied',
      });
      return;
    }

    const violations = countViolations(windowEvents, Number(allowedDpd));
    const ok = violations <= Number(maxCount);
    const compare = `${violations} <= ${maxCount}`;
    const formula = ok
      ? `Allowed DPD = ${allowedDpd}; ${windowLabel} delay events = ${violations}; ${compare} → PASS`
      : `Allowed DPD = ${allowedDpd}; ${windowLabel} delay events = ${violations}; ${compare} → FAIL`;

    results.push({
      step,
      ruleId,
      ruleName,
      formula,
      applicantValue: {
        allowedDpd,
        paymentHistoryConsidered,
        dpdViolationCount: violations,
        formula: compare,
      },
      threshold: {
        maxDpdDaysAllowed: allowedDpd,
        ...(ruleId === 'BL-DPD-3M'
          ? { maxDpdCount3Months: maxCount }
          : { maxDpdCount12Months: maxCount }),
      },
      result: ok ? 'PASS' : 'FAIL',
      errorCode: ok ? null : failCode,
      reason: ok
        ? null
        : `DPD exceeded the lender threshold in ${violations} account–month delay events during the ${windowLabel}. Allowed = ${maxCount} Actual = ${violations}`,
    });
  };

  pushCountRule(
    12,
    'BL-DPD-3M',
    'DPD last 3 months',
    BlFail.DPD_3M,
    'last 3 months',
    cut3Key,
    criteria.maxDpdCount3Months
  );
  pushCountRule(
    13,
    'BL-DPD-12M',
    'DPD last 12 months',
    BlFail.DPD_12M,
    'last 12 months',
    cut12Key,
    criteria.maxDpdCount12Months
  );

  {
    const step = 14;
    const formula = 'maxDpdDays <= maxDpdDaysAllowed';
    const max = criteria.maxDpdDaysAllowed;
    if (max == null) {
      results.push(skip(step, 'BL-DPD-DAYS', 'Max DPD days allowed', formula, { max: null }));
    } else if (profile.maxDpdDays == null) {
      results.push(
        missingFail(step, 'BL-DPD-DAYS', 'Max DPD days allowed', formula, { max })
      );
    } else {
      const ok = profile.maxDpdDays <= Number(max);
      results.push({
        step,
        ruleId: 'BL-DPD-DAYS',
        ruleName: 'Max DPD days allowed',
        formula,
        applicantValue: profile.maxDpdDays,
        threshold: { maxDpdDaysAllowed: max },
        result: ok ? 'PASS' : 'FAIL',
        errorCode: ok ? null : BlFail.DPD_DAYS,
        reason: ok ? null : 'BL-DPD-DAYS exceeded',
      });
    }
  }

  return results;
}

export function evaluateUnsecured(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula = 'activeUnsecured <= maxActiveUnsecured6Months';
  if (criteria.maxActiveUnsecured6Months == null) {
    return skip(step, 'BL-UNSECURED', 'Active unsecured count', formula, {
      maxActiveUnsecured6Months: null,
    });
  }
  if (profile.activeUnsecured == null) {
    return missingFail(step, 'BL-UNSECURED', 'Active unsecured count', formula, {
      maxActiveUnsecured6Months: criteria.maxActiveUnsecured6Months,
    });
  }
  const ok = profile.activeUnsecured <= Number(criteria.maxActiveUnsecured6Months);
  return {
    step,
    ruleId: 'BL-UNSECURED',
    ruleName: 'Active unsecured count',
    formula,
    applicantValue: profile.activeUnsecured,
    threshold: { maxActiveUnsecured6Months: criteria.maxActiveUnsecured6Months },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : BlFail.UNSECURED,
    reason: ok ? null : 'Active unsecured accounts exceed maximum',
  };
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function evaluateEnquiryExclude(
  step: number,
  profile: BlApplicantProfile,
  catalog: CatalogLender
): ConditionResult {
  const formula = 'no enquiry member matches this lender in last 3 months';

  if (
    (!profile.enquiryMembers || profile.enquiryMembers.length === 0) &&
    profile.enquiries3m === 0
  ) {
    return {
      step,
      ruleId: 'BL-ENQ-EXCLUDE',
      ruleName: 'Enquiry already with that lender',
      formula,
      applicantValue: profile.enquiryMembers,
      threshold: { lenderName: catalog.lenderName, lenderCode: catalog.lenderCode },
      result: 'SKIP',
      errorCode: null,
      reason: 'No enquiries array',
    };
  }

  const targets = [catalog.lenderName, catalog.lenderCode]
    .filter(Boolean)
    .map((s) => normalizeName(String(s)));
  const hit = (profile.enquiryMembers || []).find((m) => {
    const nm = normalizeName(m);
    return targets.some((t) => t && (nm.includes(t) || t.includes(nm)));
  });
  if (hit) {
    return {
      step,
      ruleId: 'BL-ENQ-EXCLUDE',
      ruleName: 'Enquiry already with that lender',
      formula,
      applicantValue: hit,
      threshold: { lenderName: catalog.lenderName, lenderCode: catalog.lenderCode },
      result: 'FAIL',
      errorCode: BlFail.ENQ_EXCLUDE,
      reason: `Enquiry with lender in last 3 months (matched: ${hit})`,
    };
  }
  return {
    step,
    ruleId: 'BL-ENQ-EXCLUDE',
    ruleName: 'Enquiry already with that lender',
    formula,
    applicantValue: profile.enquiryMembers,
    threshold: { lenderName: catalog.lenderName, lenderCode: catalog.lenderCode },
    result: 'PASS',
    errorCode: null,
  };
}

export function evaluateEnquiryCounts(
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult[] {
  const out: ConditionResult[] = [];

  const one = (() => {
    const step = 17;
    const formula = 'enquiries1m <= maxEnquiries1Month';
    if (criteria.maxEnquiries1Month == null) {
      return skip(step, 'BL-ENQ-1M', 'Enquiry count 1 month', formula, {
        maxEnquiries1Month: null,
      });
    }
    const ok = profile.enquiries1m <= Number(criteria.maxEnquiries1Month);
    return {
      step,
      ruleId: 'BL-ENQ-1M',
      ruleName: 'Enquiry count 1 month',
      formula,
      applicantValue: profile.enquiries1m,
      threshold: { maxEnquiries1Month: criteria.maxEnquiries1Month },
      result: (ok ? 'PASS' : 'FAIL') as ConditionResult['result'],
      errorCode: ok ? null : BlFail.ENQ_1M,
      reason: ok ? null : 'Too many enquiries in 1 month',
    };
  })();

  const three = (() => {
    const step = 18;
    const formula = 'enquiries3m <= maxEnquiries3Months';
    if (criteria.maxEnquiries3Months == null) {
      return skip(step, 'BL-ENQ-3M', 'Enquiry count 3 months', formula, {
        maxEnquiries3Months: null,
      });
    }
    const ok = profile.enquiries3m <= Number(criteria.maxEnquiries3Months);
    return {
      step,
      ruleId: 'BL-ENQ-3M',
      ruleName: 'Enquiry count 3 months',
      formula,
      applicantValue: profile.enquiries3m,
      threshold: { maxEnquiries3Months: criteria.maxEnquiries3Months },
      result: (ok ? 'PASS' : 'FAIL') as ConditionResult['result'],
      errorCode: ok ? null : BlFail.ENQ_3M,
      reason: ok ? null : 'Too many enquiries in 3 months',
    };
  })();

  out.push(one, three);
  return out;
}

export function evaluateAudited(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const ruleName = 'Audited books';

  if (criteria.auditedBooksRequired !== true) {
    return {
      step,
      ruleId: 'BL-AUDITED',
      ruleName,
      formula: 'audited_books_required = false → SKIP',
      applicantValue: profile.auditedBooks,
      threshold: { auditedBooksRequired: criteria.auditedBooksRequired },
      result: 'SKIP',
      errorCode: null,
      reason: 'audited_books_required=false',
    };
  }

  if (profile.auditedBooks === true) {
    return {
      step,
      ruleId: 'BL-AUDITED',
      ruleName,
      formula: 'audited_books_required = true && auditedBooks = true → PASS',
      applicantValue: true,
      threshold: { auditedBooksRequired: true },
      result: 'PASS',
      errorCode: null,
      reason: null,
    };
  }

  return {
    step,
    ruleId: 'BL-AUDITED',
    ruleName,
    formula: 'audited_books_required = true && auditedBooks !== true → FAIL',
    applicantValue: profile.auditedBooks ?? null,
    threshold: { auditedBooksRequired: true },
    result: 'FAIL',
    errorCode: BlFail.AUDITED,
    reason:
      profile.auditedBooks === false
        ? 'Audited books required but applicant auditedBooks is false'
        : 'Audited books required but applicant auditedBooks is missing',
  };
}

export function evaluateSettledWo(
  step: number,
  profile: BlApplicantProfile,
  criteria: BlLenderCriteria
): ConditionResult {
  const formula =
    'WO within 36m + settledWriteOff36Months===true → FAIL; flag false → PASS; no WO → PASS';
  const flag = criteria.settledWriteOff36Months as boolean | null | undefined;

  if (flag == null) {
    return skip(step, 'BL-SETTLED-WO', 'Settled / write-off (36 months)', formula, {
      settledWriteOff36Months: null,
    });
  }

  const wos = profile.writeOffAccounts || [];
  if (!wos.length) {
    return {
      step,
      ruleId: 'BL-SETTLED-WO',
      ruleName: 'Settled / write-off (36 months)',
      formula,
      applicantValue: { writeOffCount: 0 },
      threshold: { settledWriteOff36Months: flag },
      result: 'PASS',
      errorCode: null,
      reason: 'No write-off amounts on open accounts',
    };
  }

  const within36 = wos.filter(
    (w) => w.monthsSinceStart != null && w.monthsSinceStart <= 36
  );

  if (!within36.length) {
    return {
      step,
      ruleId: 'BL-SETTLED-WO',
      ruleName: 'Settled / write-off (36 months)',
      formula,
      applicantValue: {
        writeOffCount: wos.length,
        within36m: 0,
        accounts: wos,
      },
      threshold: { settledWriteOff36Months: flag },
      result: 'PASS',
      errorCode: null,
      reason: 'Write-off accounts all older than 36 months (or undated)',
    };
  }

  if (flag === true) {
    return {
      step,
      ruleId: 'BL-SETTLED-WO',
      ruleName: 'Settled / write-off (36 months)',
      formula,
      applicantValue: {
        writeOffCount: wos.length,
        within36m: within36.length,
        accounts: within36,
      },
      threshold: { settledWriteOff36Months: true },
      result: 'FAIL',
      errorCode: BlFail.SETTLED_WO,
      reason: 'Write-off within 36 months and settled_write_off_36_months rejects WO',
    };
  }

  return {
    step,
    ruleId: 'BL-SETTLED-WO',
    ruleName: 'Settled / write-off (36 months)',
    formula,
    applicantValue: {
      writeOffCount: wos.length,
      within36m: within36.length,
      accounts: within36,
    },
    threshold: { settledWriteOff36Months: false },
    result: 'PASS',
    errorCode: null,
    reason: 'settled_write_off_36_months=false — WO in window allowed',
  };
}
