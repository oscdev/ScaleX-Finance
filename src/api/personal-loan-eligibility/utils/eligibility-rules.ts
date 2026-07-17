import { PlFail } from './error-codes';
import type {
  ApplicantProfile,
  CatalogLender,
  ConditionResult,
  LenderCriteria,
} from './types';

function skip(step: number, ruleId: string, ruleName: string, formula: string, threshold: any): ConditionResult {
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

function notEvaluated(step: number, ruleId: string, priorFail: string): ConditionResult {
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
    errorCode: PlFail.MISSING_APPLICANT_VALUE,
    reason: 'Applicant value missing for required threshold',
  };
}

export function evaluateActive(
  step: number,
  catalog: CatalogLender | null,
  criteria: LenderCriteria | null
): ConditionResult {
  const formula = 'catalog.isActive && criteria.isActive && criteriaExists';
  if (!catalog || !catalog.isActive) {
    return {
      step,
      ruleId: 'PRE_ACTIVE_LENDERS',
      ruleName: 'Active lenders',
      formula,
      threshold: { catalogIsActive: catalog?.isActive ?? false },
      result: 'FAIL',
      errorCode: PlFail.PRE_ACTIVE,
      reason: 'Catalog inactive or missing',
    };
  }
  if (!criteria || !criteria.isActive) {
    return {
      step,
      ruleId: 'PRE_ACTIVE_LENDERS',
      ruleName: 'Active lenders',
      formula,
      threshold: { criteriaIsActive: criteria?.isActive ?? false },
      result: 'FAIL',
      errorCode: PlFail.PRE_ACTIVE,
      reason: 'Criteria inactive or missing',
    };
  }
  return {
    step,
    ruleId: 'PRE_ACTIVE_LENDERS',
    ruleName: 'Active lenders',
    formula,
    threshold: { catalogIsActive: true, criteriaIsActive: true },
    result: 'PASS',
    errorCode: null,
  };
}

export function evaluateZipcode(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria,
  zipRows: Array<{ zipCode?: string | null; coversAllPincodes?: boolean; isActive?: boolean }>
): ConditionResult {
  const formula = 'coversAllPincodes OR zipCode === applicantPin';
  const threshold = { pincodeCheckRequired: criteria.pincodeCheckRequired };
  if (!criteria.pincodeCheckRequired) {
    return {
      step,
      ruleId: 'A1-14-PINCODE',
      ruleName: 'Zipcode availability',
      formula,
      threshold,
      applicantValue: profile.pinCode,
      result: 'SKIP',
      matchMode: 'SKIP',
      errorCode: null,
      reason: 'pincodeCheckRequired=false',
    };
  }
  if (!profile.pinCode) {
    return missingFail(step, 'A1-14-PINCODE', 'Zipcode availability', formula, threshold);
  }
  const active = (zipRows || []).filter((z) => z.isActive !== false);
  const all = active.find((z) => z.coversAllPincodes === true);
  if (all) {
    return {
      step,
      ruleId: 'A1-14-PINCODE',
      ruleName: 'Zipcode availability',
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
      ruleId: 'A1-14-PINCODE',
      ruleName: 'Zipcode availability',
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
    ruleId: 'A1-14-PINCODE',
    ruleName: 'Zipcode availability',
    formula,
    threshold,
    applicantValue: profile.pinCode,
    result: 'FAIL',
    matchMode: 'NO_MATCH',
    errorCode: PlFail.A1_14_PINCODE,
    reason: 'Applicant pin not in lender serviceable zip set',
  };
}

export function evaluateCibilOrFtb(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  if (profile.isFirstTimeBorrower) {
    const formula = 'firstTimeBorrowerAllowed === true';
    const ok = criteria.firstTimeBorrowerAllowed === true;
    return {
      step,
      ruleId: 'A1-FTB',
      ruleName: 'First-time borrower',
      formula,
      branchUsed: 'FTB',
      applicantValue: true,
      threshold: { firstTimeBorrowerAllowed: criteria.firstTimeBorrowerAllowed },
      result: ok ? 'PASS' : 'FAIL',
      errorCode: ok ? null : PlFail.A1_FTB,
      reason: ok ? null : 'First-time borrower not allowed for this lender',
    };
  }
  const formula = 'applicantCibil >= minCibil';
  if (criteria.minCibil == null) {
    return skip(step, 'A1-01-CIBIL', 'Min CIBIL', formula, { minCibil: null });
  }
  if (profile.cibilScore == null) {
    return {
      ...missingFail(step, 'A1-01-CIBIL', 'Min CIBIL', formula, { minCibil: criteria.minCibil }),
      branchUsed: 'CIBIL',
    };
  }
  const ok = profile.cibilScore >= criteria.minCibil;
  return {
    step,
    ruleId: 'A1-01-CIBIL',
    ruleName: 'Min CIBIL',
    formula,
    branchUsed: 'CIBIL',
    applicantValue: profile.cibilScore,
    threshold: { minCibil: criteria.minCibil },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_01_CIBIL,
    reason: ok ? null : 'CIBIL below lender minimum',
  };
}

export function evaluateAge(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'minAge <= age <= maxAge';
  if (criteria.minAge == null && criteria.maxAge == null) {
    return skip(step, 'A1-02-AGE', 'Age', formula, { minAge: null, maxAge: null });
  }
  if (profile.age == null) {
    return missingFail(step, 'A1-02-AGE', 'Age', formula, {
      minAge: criteria.minAge,
      maxAge: criteria.maxAge,
    });
  }
  const geMin = criteria.minAge == null || profile.age >= criteria.minAge;
  const leMax = criteria.maxAge == null || profile.age <= criteria.maxAge;
  const ok = geMin && leMax;
  return {
    step,
    ruleId: 'A1-02-AGE',
    ruleName: 'Age',
    formula,
    applicantValue: profile.age,
    threshold: { minAge: criteria.minAge, maxAge: criteria.maxAge },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_02_AGE,
    reason: ok ? null : 'Age outside lender band',
  };
}

export function evaluateIncome(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'netMonthlyIncome >= minMonthlyIncome';
  if (criteria.minMonthlyIncome == null) {
    return skip(step, 'A1-03-INCOME', 'Min monthly income', formula, {
      minMonthlyIncome: null,
    });
  }
  if (profile.netMonthlyIncome == null) {
    return missingFail(step, 'A1-03-INCOME', 'Min monthly income', formula, {
      minMonthlyIncome: criteria.minMonthlyIncome,
    });
  }
  const ok = profile.netMonthlyIncome >= Number(criteria.minMonthlyIncome);
  return {
    step,
    ruleId: 'A1-03-INCOME',
    ruleName: 'Min monthly income',
    formula,
    applicantValue: profile.netMonthlyIncome,
    threshold: { minMonthlyIncome: criteria.minMonthlyIncome },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_03_INCOME,
    reason: ok ? null : 'Income below lender minimum',
  };
}

export function evaluateLoanAmount(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'minLoanAmount <= requestedAmount <= maxLoanAmount';
  if (criteria.minLoanAmount == null && criteria.maxLoanAmount == null) {
    return skip(step, 'A1-13-AMOUNT', 'Loan amount', formula, {
      minLoanAmount: null,
      maxLoanAmount: null,
    });
  }
  if (profile.requestedAmount == null) {
    return missingFail(step, 'A1-13-AMOUNT', 'Loan amount', formula, {
      minLoanAmount: criteria.minLoanAmount,
      maxLoanAmount: criteria.maxLoanAmount,
    });
  }
  const geMin =
    criteria.minLoanAmount == null || profile.requestedAmount >= Number(criteria.minLoanAmount);
  const leMax =
    criteria.maxLoanAmount == null || profile.requestedAmount <= Number(criteria.maxLoanAmount);
  const ok = geMin && leMax;
  return {
    step,
    ruleId: 'A1-13-AMOUNT',
    ruleName: 'Loan amount',
    formula,
    applicantValue: profile.requestedAmount,
    threshold: { minLoanAmount: criteria.minLoanAmount, maxLoanAmount: criteria.maxLoanAmount },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_13_AMOUNT,
    reason: ok ? null : 'Requested amount outside lender band',
  };
}

export function evaluateFoir(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'existingTotalEmi / netMonthlyIncome <= foir';
  if (criteria.foir == null) {
    return skip(step, 'A1-15-FOIR', 'FOIR', formula, { foir: null });
  }
  if (profile.netMonthlyIncome == null || profile.netMonthlyIncome <= 0) {
    return {
      step,
      ruleId: 'A1-15-FOIR',
      ruleName: 'FOIR',
      formula,
      applicantValue: profile.netMonthlyIncome,
      threshold: { foir: criteria.foir },
      result: 'FAIL',
      errorCode: PlFail.A1_15_FOIR,
      reason: 'Missing or zero net salary for FOIR',
    };
  }
  const foirApplicant = profile.existingTotalEmi / profile.netMonthlyIncome;
  const ok = foirApplicant <= Number(criteria.foir);
  return {
    step,
    ruleId: 'A1-15-FOIR',
    ruleName: 'FOIR',
    formula,
    applicantValue: {
      foirApplicant,
      existingTotalEmi: profile.existingTotalEmi,
      netMonthlyIncome: profile.netMonthlyIncome,
    },
    threshold: { foir: criteria.foir },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_15_FOIR,
    reason: ok ? null : 'FOIR exceeds lender maximum',
  };
}

export function evaluateDpd(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult[] {
  const results: ConditionResult[] = [];

  const check = (
    ruleId: string,
    failCode: string,
    count: number | null,
    max: number | null | undefined,
    formula: string
  ) => {
    if (max == null) {
      results.push(skip(step, ruleId, ruleId, formula, { max: null }));
      return;
    }
    if (count == null) {
      results.push(missingFail(step, ruleId, ruleId, formula, { max }));
      return;
    }
    const ok = count <= Number(max);
    results.push({
      step,
      ruleId,
      formula,
      applicantValue: count,
      threshold: { max },
      result: ok ? 'PASS' : 'FAIL',
      errorCode: ok ? null : failCode,
      reason: ok ? null : `${ruleId} exceeded`,
    });
  };

  check(
    'A1-07-DPD-3M',
    PlFail.A1_07_DPD_3M,
    profile.dpdCount3m,
    criteria.maxDpdCount3months,
    'dpdCount3m <= maxDpdCount3months'
  );
  check(
    'A1-08-DPD-12M',
    PlFail.A1_08_DPD_12M,
    profile.dpdCount12m,
    criteria.maxDpdCount12months,
    'dpdCount12m <= maxDpdCount12months'
  );
  check(
    'A1-09-DPD-DAYS',
    PlFail.A1_09_DPD_DAYS,
    profile.maxDpdDays,
    criteria.maxDpdDaysAllowed,
    'maxDpdDays <= maxDpdDaysAllowed'
  );
  if (criteria.maxDpdCount6months != null) {
    check(
      'A1-DPD-6M',
      PlFail.A1_DPD_6M,
      profile.dpdCount6m,
      criteria.maxDpdCount6months,
      'dpdCount6m <= maxDpdCount6months'
    );
  }
  return results;
}

export function evaluateCcu(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula =
    'ccOutstanding / ccLimit <= maxCCUtilizationRatio (per CC: credit_limit - current_balance)';
  if (criteria.maxCCUtilizationRatio == null) {
    return skip(step, 'A1-16-CC-UTIL', 'CCU', formula, { maxCCUtilizationRatio: null });
  }
  // No credit-card accounts on file → skip CCU (cannot evaluate util)
  if (profile.ccLimit <= 0 && profile.ccOutstanding <= 0) {
    return {
      step,
      ruleId: 'A1-16-CC-UTIL',
      ruleName: 'CCU',
      formula,
      applicantValue: { ccOutstanding: 0, ccLimit: 0 },
      threshold: { maxCCUtilizationRatio: criteria.maxCCUtilizationRatio },
      result: 'SKIP',
      errorCode: null,
      reason: 'No credit-card accounts to evaluate',
    };
  }
  if (profile.ccLimit <= 0) {
    return {
      step,
      ruleId: 'A1-16-CC-UTIL',
      ruleName: 'CCU',
      formula,
      applicantValue: { ccOutstanding: profile.ccOutstanding, ccLimit: profile.ccLimit },
      threshold: { maxCCUtilizationRatio: criteria.maxCCUtilizationRatio },
      result: 'FAIL',
      errorCode: PlFail.A1_16_CC_UTIL,
      reason: 'ccLimit <= 0',
    };
  }
  const util = profile.ccUtil ?? profile.ccOutstanding / profile.ccLimit;
  const ok = util <= Number(criteria.maxCCUtilizationRatio);
  const applicantValue = {
    ccOutstanding: profile.ccOutstanding,
    ccLimit: profile.ccLimit,
    ccUtil: util,
  };
  return {
    step,
    ruleId: 'A1-16-CC-UTIL',
    ruleName: 'CCU',
    formula,
    applicantValue,
    threshold: { maxCCUtilizationRatio: criteria.maxCCUtilizationRatio },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_16_CC_UTIL,
    reason: ok ? null : 'CC utilization above lender maximum',
  };
}

export function evaluateUnsecured(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'activeUnsecured <= maxActiveUnsecuredAccount';
  if (criteria.maxActiveUnsecuredAccount == null) {
    return skip(step, 'A1-UNSECURED', 'Active unsecured', formula, {
      maxActiveUnsecuredAccount: null,
    });
  }
  if (profile.activeUnsecured == null) {
    return missingFail(step, 'A1-UNSECURED', 'Active unsecured', formula, {
      maxActiveUnsecuredAccount: criteria.maxActiveUnsecuredAccount,
    });
  }
  const ok = profile.activeUnsecured <= Number(criteria.maxActiveUnsecuredAccount);
  return {
    step,
    ruleId: 'A1-UNSECURED',
    ruleName: 'Active unsecured',
    formula,
    applicantValue: profile.activeUnsecured,
    threshold: { maxActiveUnsecuredAccount: criteria.maxActiveUnsecuredAccount },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_UNSECURED,
    reason: ok ? null : 'Active unsecured accounts exceed maximum',
  };
}

export function evaluateSalaryType(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'salaryMode ∈ acceptedSalaryTypes';
  const list = criteria.acceptedSalaryTypes;
  if (!list || !Array.isArray(list) || list.length === 0) {
    return skip(step, 'A1-04-SALARY_TYPE', 'Accepted salary types', formula, {
      acceptedSalaryTypes: list,
    });
  }
  if (!profile.salaryMode) {
    return missingFail(step, 'A1-04-SALARY_TYPE', 'Accepted salary types', formula, {
      acceptedSalaryTypes: list,
    });
  }
  const mode = profile.salaryMode.trim().toUpperCase();
  const allowed = list.map((s) => String(s).trim().toUpperCase());
  const ok = allowed.includes(mode);
  return {
    step,
    ruleId: 'A1-04-SALARY_TYPE',
    ruleName: 'Accepted salary types',
    formula,
    applicantValue: profile.salaryMode,
    threshold: { acceptedSalaryTypes: list },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_04_SALARY_TYPE,
    reason: ok ? null : 'Salary mode not in accepted list',
  };
}

export function evaluatePf(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = '!pfRequired OR pfDeducted === true';
  if (!criteria.pfRequired) {
    return {
      step,
      ruleId: 'A1-05-PF',
      ruleName: 'PF required',
      formula,
      threshold: { pfRequired: false },
      result: 'PASS',
      errorCode: null,
      reason: 'pfRequired=false',
    };
  }
  if (profile.pfDeducted == null) {
    return missingFail(step, 'A1-05-PF', 'PF required', formula, { pfRequired: true });
  }
  const ok = profile.pfDeducted === true;
  return {
    step,
    ruleId: 'A1-05-PF',
    ruleName: 'PF required',
    formula,
    applicantValue: profile.pfDeducted,
    threshold: { pfRequired: true },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_05_PF,
    reason: ok ? null : 'PF deduction required but not present',
  };
}

export function evaluateEmployment(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult {
  const formula = 'employmentMonths >= minEmploymentMonths';
  if (criteria.minEmploymentMonths == null) {
    return skip(step, 'A1-06-EMPLOYMENT', 'Min employment months', formula, {
      minEmploymentMonths: null,
    });
  }
  if (profile.employmentMonths == null) {
    return missingFail(step, 'A1-06-EMPLOYMENT', 'Min employment months', formula, {
      minEmploymentMonths: criteria.minEmploymentMonths,
    });
  }
  const ok = profile.employmentMonths >= Number(criteria.minEmploymentMonths);
  return {
    step,
    ruleId: 'A1-06-EMPLOYMENT',
    ruleName: 'Min employment months',
    formula,
    applicantValue: profile.employmentMonths,
    threshold: { minEmploymentMonths: criteria.minEmploymentMonths },
    result: ok ? 'PASS' : 'FAIL',
    errorCode: ok ? null : PlFail.A1_06_EMPLOYMENT,
    reason: ok ? null : 'Employment tenure below minimum',
  };
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function evaluateEnquiryExclude(
  step: number,
  profile: ApplicantProfile,
  catalog: CatalogLender
): ConditionResult {
  const formula = 'no enquiry member matches this lender in last 3 months';
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
      ruleId: 'A1-ENQ-EXCLUDE',
      ruleName: 'Enquiry already with lender',
      formula,
      applicantValue: hit,
      threshold: { lenderName: catalog.lenderName, lenderCode: catalog.lenderCode },
      result: 'FAIL',
      errorCode: PlFail.A1_ENQ_EXCLUDE,
      reason: `Enquiry with lender in last 3 months (matched: ${hit})`,
    };
  }
  return {
    step,
    ruleId: 'A1-ENQ-EXCLUDE',
    ruleName: 'Enquiry already with lender',
    formula,
    applicantValue: profile.enquiryMembers,
    threshold: { lenderName: catalog.lenderName, lenderCode: catalog.lenderCode },
    result: 'PASS',
    errorCode: null,
  };
}

export function evaluateEnquiryCounts(
  step: number,
  profile: ApplicantProfile,
  criteria: LenderCriteria
): ConditionResult[] {
  const out: ConditionResult[] = [];
  const one = (() => {
    const formula = 'enquiries1m <= maxEnquiries1month';
    if (criteria.maxEnquiries1month == null) {
      return skip(step, 'A1-11-ENQ-1M', 'Enquiries 1m', formula, { maxEnquiries1month: null });
    }
    const ok = profile.enquiries1m <= Number(criteria.maxEnquiries1month);
    return {
      step,
      ruleId: 'A1-11-ENQ-1M',
      ruleName: 'Enquiries 1m',
      formula,
      applicantValue: profile.enquiries1m,
      threshold: { maxEnquiries1month: criteria.maxEnquiries1month },
      result: (ok ? 'PASS' : 'FAIL') as ConditionResult['result'],
      errorCode: ok ? null : PlFail.A1_11_ENQ_1M,
      reason: ok ? null : 'Too many enquiries in 1 month',
    };
  })();
  const three = (() => {
    const formula = 'enquiries3m <= maxEnquiries3months';
    if (criteria.maxEnquiries3months == null) {
      return skip(step, 'A1-12-ENQ-3M', 'Enquiries 3m', formula, { maxEnquiries3months: null });
    }
    const ok = profile.enquiries3m <= Number(criteria.maxEnquiries3months);
    return {
      step,
      ruleId: 'A1-12-ENQ-3M',
      ruleName: 'Enquiries 3m',
      formula,
      applicantValue: profile.enquiries3m,
      threshold: { maxEnquiries3months: criteria.maxEnquiries3months },
      result: (ok ? 'PASS' : 'FAIL') as ConditionResult['result'],
      errorCode: ok ? null : PlFail.A1_12_ENQ_3M,
      reason: ok ? null : 'Too many enquiries in 3 months',
    };
  })();
  out.push(one, three);
  return out;
}

export { notEvaluated };
