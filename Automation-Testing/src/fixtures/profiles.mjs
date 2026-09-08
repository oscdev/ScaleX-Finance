/** Synthetic applicant / lender / catalog fixtures for offline rule evaluation. */

function clone(base, patch = {}) {
  return { ...base, ...patch };
}

function monthKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Recent month keys (newest first) for DPD windows. */
export function recentMonthKeys(count = 14) {
  const keys = [];
  const d = new Date();
  for (let i = 0; i < count; i += 1) {
    keys.push(monthKeyFromDate(d));
    d.setMonth(d.getMonth() - 1);
  }
  return keys;
}

const cleanPaymentHistory = recentMonthKeys(14).map((monthKey) => ({
  monthKey,
  dpdDays: 0,
}));

export const catalogLender = {
  id: 9001,
  lenderCode: 'FIXT',
  lenderName: 'Fixture Bank',
  lenderType: 'NBFC',
  isActive: true,
};

export const zipRowsPass = [
  { zipCode: '110001', coversAllPincodes: false, isActive: true, lenderCode: 'FIXT' },
];

export const zipRowsFail = [
  { zipCode: '400001', coversAllPincodes: false, isActive: true, lenderCode: 'FIXT' },
];

export const plLenderCriteriaPass = {
  lenderCode: 'FIXT',
  isActive: true,
  minCibil: 700,
  firstTimeBorrowerAllowed: true,
  minInterestRate: 11,
  maxInterestRate: 18,
  pincodeCheckRequired: true,
  minAge: 21,
  maxAge: 60,
  minMonthlyIncome: 25000,
  foir: 60,
  maxCCUtilizationRatio: 0.8,
  maxActiveUnsecuredAccount: 5,
  acceptedSalaryTypes: ['Bank Transfer', 'Cash'],
  pfRequired: true,
  minEmploymentMonths: 12,
  maxDpdDaysAllowed: 30,
  maxDpdCount3months: 2,
  maxDpdCount12months: 4,
  maxEnquiries1month: 3,
  maxEnquiries3months: 6,
  minLoanAmount: 50000,
  maxLoanAmount: 2000000,
};

export const plApplicantProfilePass = {
  leadId: 99901,
  fullName: 'Fixture Applicant',
  pinCode: '110001',
  requestedAmount: 500000,
  loanAmount: 500000,
  netMonthlyIncome: 80000,
  hasOtherIncome: false,
  otherIncomeAmount: 0,
  salaryMode: 'Bank Transfer',
  employmentMonths: 48,
  dob: '1990-05-15',
  age: 35,
  cibilScore: 750,
  isFirstTimeBorrower: false,
  pfDeducted: true,
  existingTotalEmi: 10000,
  tenureMonths: 60,
  paymentHistoryMonths: cleanPaymentHistory,
  latestPaymentMonth: { monthKey: cleanPaymentHistory[0].monthKey, dpdDays: 0 },
  maxDpdDays: 0,
  enquiries1m: 1,
  enquiries3m: 2,
  enquiryMembers: ['Some Other NBFC'],
  ccOutstanding: 20000,
  ccLimit: 100000,
  ccUtil: 0.2,
  activeUnsecured: 1,
  hasBureau: true,
};

export const blLenderCriteriaPass = {
  lenderCode: 'FIXT',
  isActive: true,
  minCibil: 700,
  firstTimeBorrowerAllowed: true,
  maxAgeYears: 65,
  minAgeYears: 21,
  eligibleEntityTypes: ['Proprietorship', 'Partnership'],
  currentOverdue: false,
  settledWriteOff36Months: true,
  minCreditHistoryMonths: 12,
  minAnnualTurnover: 1000000,
  minVintageYears: 2,
  itrFilingYearsRequired: 2,
  gstMandatory: false,
  auditedBooksRequired: true,
  bankStatementMonthsRequired: 6,
  minLoanAmount: 100000,
  maxLoanAmount: 5000000,
  minInterestRate: 12,
  maxInterestRate: 20,
  foirMax: 65,
  maxCcUtilizationRatio: 0.85,
  maxActiveUnsecured6Months: 4,
  maxEnquiries1Month: 3,
  maxEnquiries3Months: 8,
  maxDpdCount3Months: 2,
  maxDpdCount12Months: 4,
  maxDpdDaysAllowed: 30,
};

export const blApplicantProfilePass = {
  leadId: 99902,
  fullName: 'Fixture Business',
  pinCode: '110001',
  requestedAmount: 1500000,
  loanAmount: 1500000,
  loanType: 'Business Loan',
  applicationDate: new Date('2026-09-01'),
  entityType: 'Proprietorship',
  turnoverLakh: 50,
  annualTurnoverInr: 5000000,
  businessVintageYears: 5,
  auditedBooks: true,
  dob: '1985-03-10',
  age: 40,
  cibilScore: 760,
  isFirstTimeBorrower: false,
  existingTotalEmi: 15000,
  paymentHistoryMonths: cleanPaymentHistory,
  latestPaymentMonth: { monthKey: cleanPaymentHistory[0].monthKey, dpdDays: 0 },
  maxDpdDays: 0,
  enquiries1m: 1,
  enquiries3m: 2,
  enquiryMembers: ['Other Finance Co'],
  ccOutstanding: 30000,
  ccLimit: 150000,
  ccUtil: 0.2,
  activeUnsecured: 1,
  writeOffAccounts: [],
  hasBureau: true,
  hasLoanApp: true,
};

/** PL scoring catalog rows — weights sum to 100 (matches seed SQL). */
export const plScoringCatalog = [
  { criterionCode: 'CIBIL_SCORE', criterionName: 'CIBIL Score', category: 'Credit', loanType: 'Personal Loan', weight: 20, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'FOIR_CHECK', criterionName: 'FOIR Check', category: 'Credit', loanType: 'Personal Loan', weight: 15, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'DPD_LAST_3M', criterionName: 'DPD Last 3 Months', category: 'Credit', loanType: 'Personal Loan', weight: 10, ruleType: 'JSON', rules: { 0: 10, 2: 8, 4: 6, 6: 4, 8: 2 }, isActive: true },
  { criterionCode: 'DPD_LAST_12M', criterionName: 'DPD Last 12 Months', category: 'Credit', loanType: 'Personal Loan', weight: 8, ruleType: 'JSON', rules: { 2: 8, 5: 6, 8: 4, 12: 2 }, isActive: true },
  { criterionCode: 'CC_UTILIZATION', criterionName: 'CC Utilization', category: 'Credit', loanType: 'Personal Loan', weight: 5, ruleType: 'JSON', rules: { 50: 5, 70: 3, 80: 1 }, isActive: true },
  { criterionCode: 'ACTIVE_UNSECURED', criterionName: 'Active Unsecured Loans', category: 'Credit', loanType: 'Personal Loan', weight: 5, ruleType: 'JSON', rules: { 0: 5, 2: 3, 4: 2, 8: 1 }, isActive: true },
  { criterionCode: 'ENQUIRIES_3M', criterionName: 'Enquiries (3 Months)', category: 'Credit', loanType: 'Personal Loan', weight: 4, ruleType: 'JSON', rules: { 0: 4, 3: 2, 6: 1 }, isActive: true },
  { criterionCode: 'MONTHLY_INCOME', criterionName: 'Monthly Income vs Threshold', category: 'Business', loanType: 'Personal Loan', weight: 10, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'JOB_EXPERIENCE', criterionName: 'Job Experience', category: 'Business', loanType: 'Personal Loan', weight: 7, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'ROI_COMPETITIVENESS', criterionName: 'ROI Competitiveness', category: 'Loan', loanType: 'Personal Loan', weight: 9, ruleType: 'JSON', rules: { 11: 9, 13: 7, 15: 5, 20: 3, 25: 1 }, isActive: true },
  { criterionCode: 'MAX_LOAN_ADEQUACY', criterionName: 'Max Loan Adequacy', category: 'Loan', loanType: 'Personal Loan', weight: 7, ruleType: 'JSON+FORMULA', rules: { 50: 7, 75: 4 }, isActive: true },
];

/** BL scoring catalog rows — weights sum to 100; STATIC ITR/reg-proof at 3 each. */
export const blScoringCatalog = [
  { criterionCode: 'CIBIL_SCORE', criterionName: 'CIBIL Score', category: 'Credit', loanType: 'Business Loan', weight: 20, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'FOIR_CHECK', criterionName: 'FOIR Check', category: 'Credit', loanType: 'Business Loan', weight: 15, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'DPD_LAST_3M', criterionName: 'DPD Last 3 Months', category: 'Credit', loanType: 'Business Loan', weight: 10, ruleType: 'JSON', rules: { 0: 10, 2: 8, 4: 6, 6: 4, 8: 2 }, isActive: true },
  { criterionCode: 'DPD_LAST_12M', criterionName: 'DPD Last 12 Months', category: 'Credit', loanType: 'Business Loan', weight: 8, ruleType: 'JSON', rules: { 2: 8, 5: 6, 8: 4, 12: 2 }, isActive: true },
  { criterionCode: 'CC_UTILIZATION', criterionName: 'CC Utilization', category: 'Credit', loanType: 'Business Loan', weight: 5, ruleType: 'JSON', rules: { 50: 5, 70: 3, 80: 1 }, isActive: true },
  { criterionCode: 'ACTIVE_UNSECURED', criterionName: 'Active Unsecured Loans', category: 'Credit', loanType: 'Business Loan', weight: 5, ruleType: 'JSON', rules: { 0: 5, 2: 3, 4: 2, 8: 1 }, isActive: true },
  { criterionCode: 'ENQUIRIES_3M', criterionName: 'Enquiries (3 Months)', category: 'Credit', loanType: 'Business Loan', weight: 4, ruleType: 'JSON', rules: { 0: 4, 3: 2, 6: 1 }, isActive: true },
  { criterionCode: 'ANNUAL_TURNOVER', criterionName: 'Annual Turnover vs Threshold', category: 'Business', loanType: 'Business Loan', weight: 10, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'BUSINESS_VINTAGE', criterionName: 'Business Vintage', category: 'Business', loanType: 'Business Loan', weight: 7, ruleType: 'FORMULA', rules: null, isActive: true },
  { criterionCode: 'ITR_DOCUMENTATION', criterionName: 'ITR & Documentation', category: 'Business', loanType: 'Business Loan', weight: 3, ruleType: 'STATIC', rules: null, isActive: true },
  { criterionCode: 'BUSINESS_REGISTRATION_PROOF', criterionName: 'Business Registration Proof', category: 'Business', loanType: 'Business Loan', weight: 3, ruleType: 'STATIC', rules: null, isActive: true },
  { criterionCode: 'ROI_COMPETITIVENESS', criterionName: 'ROI Competitiveness', category: 'Loan', loanType: 'Business Loan', weight: 6, ruleType: 'JSON', rules: { 11: 6, 13: 5, 15: 4, 20: 2, 25: 1 }, isActive: true },
  { criterionCode: 'MAX_LOAN_ADEQUACY', criterionName: 'Max Loan Adequacy', category: 'Loan', loanType: 'Business Loan', weight: 4, ruleType: 'JSON+FORMULA', rules: { 50: 4, 75: 2 }, isActive: true },
];

export const blFormPassPayload = {
  loanType: 'Business Loan',
  form_data: {
    businessDetails: {
      name: 'Fixture Traders',
      premises: 'Owned',
      type: 'Proprietorship',
      turnover: 50,
      age: 5,
      regProofs: ['Shop Registration Certificate'],
      auditedBooks: false,
      address: '12 Market Road',
    },
    personalDetails: {
      dob: '1990-01-15',
      maritalStatus: 'Married',
      motherName: 'Fixture Mother',
    },
    addressDetails: {
      line1: 'Flat 1',
      landmark: 'Near Park',
      state: 'Delhi',
      district: 'Central Delhi',
      city: 'New Delhi',
      residenceType: 'Owned',
    },
    documents: [{ key: 'regProof_Shop_Registration_Certificate', name: 'Shop Registration Certificate' }],
  },
  aadharCardFront: 101,
  aadharCardBack: 102,
  panCard: 103,
  cibilReport: 104,
  bankStatement: 105,
  itrYear1: 106,
  proprietorshipDoc: 107,
  businessRegProofDoc: 108,
};

export const blFormFailPayload = {
  loanType: 'Business Loan',
  form_data: {
    businessDetails: { regProofs: [] },
    personalDetails: {},
    addressDetails: {},
    documents: [],
  },
};

const dpdViolationHistory = recentMonthKeys(3).flatMap((monthKey) => [
  { monthKey, dpdDays: 45 },
  { monthKey, dpdDays: 45 },
]);

/** Per-rule profile/criteria overrides for PL eligibility PASS / FAIL / SKIP. */
export function plEligibilityVariant(ruleId, outcome) {
  const base = {
    profile: plApplicantProfilePass,
    criteria: plLenderCriteriaPass,
    catalog: catalogLender,
    zipRows: zipRowsPass,
  };

  switch (ruleId) {
    case 'PL-PRE-ACTIVE':
      if (outcome === 'FAIL') return { ...base, catalog: clone(catalogLender, { isActive: false }) };
      return base;
    case 'PL-PINCODE':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { pinCode: '999999' }), zipRows: zipRowsFail };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { pincodeCheckRequired: false }) };
      return base;
    case 'PL-CIBIL':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { cibilScore: 650 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { minCibil: null }) };
      return base;
    case 'PL-FTB':
      if (outcome === 'PASS') return { ...base, profile: clone(plApplicantProfilePass, { isFirstTimeBorrower: true, cibilScore: -1 }) };
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { isFirstTimeBorrower: true, cibilScore: -1 }), criteria: clone(plLenderCriteriaPass, { firstTimeBorrowerAllowed: false }) };
      return base;
    case 'PL-DPD-LATEST':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { latestPaymentMonth: { monthKey: cleanPaymentHistory[0].monthKey, dpdDays: 45 } }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxDpdDaysAllowed: null }) };
      return base;
    case 'PL-AGE':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { age: 70 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { minAge: null, maxAge: null }) };
      return base;
    case 'PL-INCOME':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { netMonthlyIncome: 10000 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { minMonthlyIncome: null }) };
      return base;
    case 'PL-AMOUNT':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { requestedAmount: 10000, loanAmount: 10000 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { minLoanAmount: null, maxLoanAmount: null }) };
      return base;
    case 'PL-FOIR':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { foir: 0.1 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { foir: null }) };
      return base;
    case 'PL-DPD-3M':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { paymentHistoryMonths: [...dpdViolationHistory, ...cleanPaymentHistory] }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxDpdCount3months: null }) };
      return base;
    case 'PL-DPD-12M':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { paymentHistoryMonths: recentMonthKeys(14).map((m) => ({ monthKey: m, dpdDays: 35 })) }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxDpdCount12months: null }) };
      return base;
    case 'PL-DPD-DAYS':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { maxDpdDays: 60 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxDpdDaysAllowed: null }) };
      return base;
    case 'PL-CC-UTIL':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { ccOutstanding: 90000, ccLimit: 100000, ccUtil: 0.9 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxCCUtilizationRatio: null }) };
      return base;
    case 'PL-UNSECURED':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { activeUnsecured: 10 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxActiveUnsecuredAccount: null }) };
      return base;
    case 'PL-SALARY-TYPE':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { salaryMode: 'Cheque' }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { acceptedSalaryTypes: null }) };
      return base;
    case 'PL-PF':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { pfDeducted: false }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { pfRequired: false }) };
      return base;
    case 'PL-EMPLOYMENT':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { employmentMonths: 3 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { minEmploymentMonths: null }) };
      return base;
    case 'PL-ENQ-EXCLUDE':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { enquiryMembers: ['Fixture Bank'] }) };
      return base;
    case 'PL-ENQ-1M':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { enquiries1m: 10 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxEnquiries1month: null }) };
      return base;
    case 'PL-ENQ-3M':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { enquiries3m: 20 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(plLenderCriteriaPass, { maxEnquiries3months: null }) };
      return base;
    default:
      return base;
  }
}

/** Per-rule profile/criteria overrides for BL eligibility PASS / FAIL / SKIP. */
export function blEligibilityVariant(ruleId, outcome) {
  const base = {
    profile: blApplicantProfilePass,
    criteria: blLenderCriteriaPass,
    catalog: catalogLender,
    zipRows: zipRowsPass,
  };

  switch (ruleId) {
    case 'BL-PRE-ACTIVE':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { isActive: false }) };
      return base;
    case 'BL-PINCODE':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { pinCode: '999999' }), zipRows: zipRowsFail };
      return base;
    case 'BL-CIBIL':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { cibilScore: 640 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { minCibil: null }) };
      return base;
    case 'BL-FTB':
      if (outcome === 'PASS') return { ...base, profile: clone(blApplicantProfilePass, { isFirstTimeBorrower: true, cibilScore: -1 }) };
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { isFirstTimeBorrower: true, cibilScore: -1 }), criteria: clone(blLenderCriteriaPass, { firstTimeBorrowerAllowed: false }) };
      return base;
    case 'BL-CURRENT-OVERDUE':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { latestPaymentMonth: { monthKey: cleanPaymentHistory[0].monthKey, dpdDays: 10 } }) };
      if (outcome === 'PASS') return { ...base, criteria: clone(blLenderCriteriaPass, { currentOverdue: true }) };
      return base;
    case 'BL-AGE':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { age: 70 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { minAgeYears: null, maxAgeYears: null }) };
      return base;
    case 'BL-ENTITY':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { entityType: 'LLP' }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { eligibleEntityTypes: null }) };
      return base;
    case 'BL-TURNOVER':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { turnoverLakh: 5, annualTurnoverInr: 500000 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { minAnnualTurnover: null }) };
      return base;
    case 'BL-VINTAGE':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { businessVintageYears: 1 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { minVintageYears: null }) };
      return base;
    case 'BL-AMOUNT':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { requestedAmount: 50000, loanAmount: 50000 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { minLoanAmount: null, maxLoanAmount: null }) };
      return base;
    case 'BL-FOIR':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { foirMax: 0.1 }), profile: clone(blApplicantProfilePass, { existingTotalEmi: 50000 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { foirMax: null }) };
      return base;
    case 'BL-CC-UTIL':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { ccOutstanding: 140000, ccLimit: 150000, ccUtil: 0.93 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxCcUtilizationRatio: null }) };
      return base;
    case 'BL-DPD-3M':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { paymentHistoryMonths: [...dpdViolationHistory, ...cleanPaymentHistory] }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxDpdCount3Months: null }) };
      return base;
    case 'BL-DPD-12M':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { paymentHistoryMonths: recentMonthKeys(14).map((m) => ({ monthKey: m, dpdDays: 35 })) }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxDpdCount12Months: null }) };
      return base;
    case 'BL-DPD-DAYS':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { maxDpdDays: 60 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxDpdDaysAllowed: null }) };
      return base;
    case 'BL-UNSECURED':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { activeUnsecured: 12 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxActiveUnsecured6Months: null }) };
      return base;
    case 'BL-ENQ-EXCLUDE':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { enquiryMembers: ['Fixture Bank'] }) };
      return base;
    case 'BL-ENQ-1M':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { enquiries1m: 10 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxEnquiries1Month: null }) };
      return base;
    case 'BL-ENQ-3M':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { enquiries3m: 20 }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { maxEnquiries3Months: null }) };
      return base;
    case 'BL-AUDITED':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { auditedBooks: false }) };
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { auditedBooksRequired: false }) };
      return base;
    case 'BL-SETTLED-WO':
      if (outcome === 'FAIL') {
        return {
          ...base,
          profile: clone(blApplicantProfilePass, {
            writeOffAccounts: [{ paymentStartDate: '2025-01-01', writtenOffAmount: 50000, monthsSinceStart: 12 }],
          }),
        };
      }
      if (outcome === 'SKIP') return { ...base, criteria: clone(blLenderCriteriaPass, { settledWriteOff36Months: null }) };
      return base;
    default:
      return base;
  }
}

export function plScoringVariant(criterionId, outcome) {
  const catalogRow = plScoringCatalog.find((r) => r.criterionCode === criterionId);
  const base = {
    profile: plApplicantProfilePass,
    criteria: plLenderCriteriaPass,
    catalogRow,
  };

  switch (criterionId) {
    case 'CIBIL_SCORE':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { minCibil: null }) };
      return base;
    case 'FOIR_CHECK':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { foir: null }) };
      return base;
    case 'DPD_LAST_3M':
    case 'DPD_LAST_12M':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { maxDpdDaysAllowed: null }) };
      return base;
    case 'CC_UTILIZATION':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { ccOutstanding: 50000, ccLimit: 0 }) };
      return base;
    case 'MONTHLY_INCOME':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { minMonthlyIncome: null }) };
      return base;
    case 'JOB_EXPERIENCE':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { minEmploymentMonths: null }) };
      return base;
    case 'ROI_COMPETITIVENESS':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { minInterestRate: null }) };
      return base;
    case 'MAX_LOAN_ADEQUACY':
      if (outcome === 'FAIL') return { ...base, criteria: clone(plLenderCriteriaPass, { maxLoanAmount: null }) };
      return base;
    case 'ACTIVE_UNSECURED':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { activeUnsecured: null }) };
      return base;
    case 'ENQUIRIES_3M':
      if (outcome === 'FAIL') return { ...base, profile: clone(plApplicantProfilePass, { enquiries3m: null }) };
      return base;
    default:
      return base;
  }
}

export function blScoringVariant(criterionId, outcome) {
  const catalogRow = blScoringCatalog.find((r) => r.criterionCode === criterionId);
  const base = {
    profile: blApplicantProfilePass,
    criteria: blLenderCriteriaPass,
    catalogRow,
  };

  switch (criterionId) {
    case 'CIBIL_SCORE':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { minCibil: null }) };
      return base;
    case 'FOIR_CHECK':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { foirMax: null }) };
      return base;
    case 'DPD_LAST_3M':
    case 'DPD_LAST_12M':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { maxDpdDaysAllowed: null }) };
      return base;
    case 'CC_UTILIZATION':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { ccOutstanding: 50000, ccLimit: 0 }) };
      return base;
    case 'ANNUAL_TURNOVER':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { minAnnualTurnover: null }) };
      return base;
    case 'BUSINESS_VINTAGE':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { minVintageYears: null }) };
      return base;
    case 'ITR_DOCUMENTATION':
    case 'BUSINESS_REGISTRATION_PROOF':
      if (outcome === 'FAIL') return { ...base, catalogRow: { ...catalogRow, weight: 0 } };
      return base;
    case 'ROI_COMPETITIVENESS':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { minInterestRate: null }) };
      return base;
    case 'MAX_LOAN_ADEQUACY':
      if (outcome === 'FAIL') return { ...base, criteria: clone(blLenderCriteriaPass, { maxLoanAmount: null }) };
      return base;
    case 'ACTIVE_UNSECURED':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { activeUnsecured: null }) };
      return base;
    case 'ENQUIRIES_3M':
      if (outcome === 'FAIL') return { ...base, profile: clone(blApplicantProfilePass, { enquiries3m: null }) };
      return base;
    default:
      return base;
  }
}
