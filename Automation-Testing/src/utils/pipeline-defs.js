/** PL eligibility pipeline step definitions for offline demo + reports. */

export const PL_PIPELINE = [
  { step: 1, ruleId: 'PL-PRE-ACTIVE', ruleName: 'Active lenders', formula: 'catalog.isActive && criteria.isActive' },
  { step: 2, ruleId: 'PL-PINCODE', ruleName: 'Zipcode availability', formula: 'coversAllPincodes OR zipCode === applicantPin' },
  { step: 3, ruleId: 'PL-CIBIL', ruleName: 'Min CIBIL', formula: 'applicantCibil >= minCibil' },
  { step: 4, ruleId: 'PL-DPD-LATEST', ruleName: 'Latest open-account DPD', formula: 'latestDpdDays <= max_dpd_days_allowed' },
  { step: 5, ruleId: 'PL-AGE', ruleName: 'Age', formula: 'minAge <= age <= maxAge' },
  { step: 6, ruleId: 'PL-INCOME', ruleName: 'Minimum Monthly Income', formula: 'netSalary >= min_monthly_income' },
  { step: 7, ruleId: 'PL-AMOUNT', ruleName: 'Loan amount', formula: 'minLoanAmount <= requestedAmount <= maxLoanAmount' },
  { step: 8, ruleId: 'PL-FOIR', ruleName: 'FOIR', formula: 'existingTotalEmi / netMonthlyIncome <= foir' },
  { step: 9, ruleId: 'PL-DPD-3M', ruleName: 'DPD Last 3 Months', formula: 'dpdViolationCount3Months <= max' },
  { step: 10, ruleId: 'PL-DPD-12M', ruleName: 'DPD Last 12 Months', formula: 'dpdViolationCount12Months <= max' },
  { step: 11, ruleId: 'PL-DPD-DAYS', ruleName: 'Max DPD days', formula: 'maxDpdDays <= maxDpdDaysAllowed' },
  { step: 12, ruleId: 'PL-CC-UTIL', ruleName: 'Credit card utilization', formula: 'ccOutstanding / ccLimit <= maxCCUtilizationRatio' },
  { step: 13, ruleId: 'PL-UNSECURED', ruleName: 'Active unsecured accounts', formula: 'activeUnsecured <= maxActiveUnsecuredAccount' },
  { step: 14, ruleId: 'PL-SALARY-TYPE', ruleName: 'Accepted salary types', formula: 'salaryMode IN acceptedSalaryTypes' },
  { step: 15, ruleId: 'PL-PF', ruleName: 'PF Deducted', formula: 'pf_required → pfDeducted must be true' },
  { step: 16, ruleId: 'PL-EMPLOYMENT', ruleName: 'Min employment months', formula: 'employmentMonths >= minEmploymentMonths' },
  { step: 17, ruleId: 'PL-ENQ-EXCLUDE', ruleName: 'Enquiry already with lender', formula: 'no self-enquiry in last 3 months' },
  { step: 18, ruleId: 'PL-ENQ-1M', ruleName: 'Enquiries 1 month', formula: 'enquiries1m <= maxEnquiries1month' },
  { step: 19, ruleId: 'PL-ENQ-3M', ruleName: 'Enquiries 3 months', formula: 'enquiries3m <= maxEnquiries3months' },
];

export const BL_PIPELINE = [
  { step: 1, ruleId: 'BL-ACTIVE', ruleName: 'Active lenders', formula: 'catalog.isActive && criteria.isActive' },
  { step: 2, ruleId: 'BL-PINCODE', ruleName: 'Zipcode availability', formula: 'coversAllPincodes OR zipCode === applicantPin' },
  { step: 3, ruleId: 'BL-CIBIL', ruleName: 'Min CIBIL / FTB', formula: 'cibil >= min OR first_time_borrower_allowed' },
  { step: 4, ruleId: 'BL-CURRENT-OVERDUE', ruleName: 'Current overdue', formula: 'no current overdue accounts' },
  { step: 5, ruleId: 'BL-AGE', ruleName: 'Age', formula: 'minAge <= age <= maxAge' },
  { step: 6, ruleId: 'BL-ENTITY', ruleName: 'Entity type', formula: 'entity IN eligible_entity_types' },
  { step: 7, ruleId: 'BL-TURNOVER', ruleName: 'Annual turnover', formula: 'turnoverLakh >= min_annual_turnover' },
  { step: 8, ruleId: 'BL-VINTAGE', ruleName: 'Business vintage', formula: 'businessAgeYears >= min_business_vintage' },
  { step: 9, ruleId: 'BL-AMOUNT', ruleName: 'Loan amount', formula: 'minLoanAmount <= requestedAmount <= maxLoanAmount' },
  { step: 10, ruleId: 'BL-FOIR', ruleName: 'FOIR', formula: 'existingTotalEmi / income <= foir' },
];

export const PL_SCORING_CRITERIA = [
  'CIBIL_SCORE', 'FOIR_CHECK', 'DPD_LAST_3M', 'DPD_LAST_12M', 'CC_UTILIZATION',
  'ACTIVE_UNSECURED', 'ENQUIRIES_3M', 'MONTHLY_INCOME', 'JOB_EXPERIENCE',
  'ROI_COMPETITIVENESS', 'MAX_LOAN_ADEQUACY',
];

export const BL_SCORING_CRITERIA = [
  'CIBIL_SCORE', 'ANNUAL_TURNOVER', 'BUSINESS_VINTAGE', 'FOIR_CHECK',
  'DPD_LAST_3M', 'DPD_LAST_12M', 'ITR_DOCUMENTATION', 'BUSINESS_REGISTRATION_PROOF',
  'ROI_COMPETITIVENESS', 'MAX_LOAN_ADEQUACY',
];
