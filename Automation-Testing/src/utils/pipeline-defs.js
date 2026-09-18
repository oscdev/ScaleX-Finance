/** PL eligibility pipeline step definitions for offline demo + reports. */

export const PL_PIPELINE = [
  { step: 1, ruleId: 'PL-PRE-ACTIVE', ruleName: 'Active lenders', formula: 'catalog.isActive && criteria.isActive' },
  { step: 2, ruleId: 'PL-PINCODE', ruleName: 'Zipcode availability', formula: "loanType = 'PL' AND isActive AND (coversAllPincodes OR zipCode === applicantPin)" },
  { step: 3, ruleId: 'PL-CIBIL', ruleName: 'Min CIBIL', formula: 'applicantCibil >= minCibil' },
  { step: 4, ruleId: 'PL-DPD-LATEST', ruleName: 'Latest open-account DPD', formula: 'latestDpdDays <= max_dpd_days_allowed' },
  { step: 5, ruleId: 'PL-AGE', ruleName: 'Age', formula: 'minAge <= age <= maxAge' },
  { step: 6, ruleId: 'PL-INCOME', ruleName: 'Minimum Monthly Income', formula: 'netSalary >= min_monthly_income' },
  { step: 7, ruleId: 'PL-AMOUNT', ruleName: 'Loan amount', formula: 'minLoanAmount <= requestedAmount <= maxLoanAmount' },
  { step: 8, ruleId: 'PL-FOIR', ruleName: 'FOIR', formula: 'existingTotalEmi / netMonthlyIncome <= foir' },
  { step: 9, ruleId: 'PL-DPD-3M', ruleName: 'DPD Last 3 Months', formula: 'dpdViolationCount3Months <= max' },
  { step: 10, ruleId: 'PL-DPD-12M', ruleName: 'DPD Last 12 Months', formula: 'dpdViolationCount12Months <= max' },
  { step: 11, ruleId: 'PL-DPD-DAYS', ruleName: 'Max DPD days', formula: 'maxDpdDays <= maxDpdDaysAllowed' },
  { step: 12, ruleId: 'PL-CC-UTIL', ruleName: 'Credit card utilization', formula: 'ccOutstanding / ccLimit <= maxCCUtilizationRatio; SKIP when no CC accounts (ccLimit=0 and ccOutstanding=0)' },
  { step: 13, ruleId: 'PL-UNSECURED', ruleName: 'Active unsecured accounts', formula: 'activeUnsecured <= maxActiveUnsecuredAccount' },
  { step: 14, ruleId: 'PL-SALARY-TYPE', ruleName: 'Accepted salary types', formula: 'salaryMode IN acceptedSalaryTypes' },
  { step: 15, ruleId: 'PL-PF', ruleName: 'PF Deducted', formula: 'pf_required → pfDeducted must be true' },
  { step: 16, ruleId: 'PL-EMPLOYMENT', ruleName: 'Min employment months', formula: 'employmentMonths >= minEmploymentMonths' },
  { step: 17, ruleId: 'PL-ENQ-EXCLUDE', ruleName: 'Enquiry already with lender', formula: 'no self-enquiry in last 3 months' },
  { step: 18, ruleId: 'PL-ENQ-1M', ruleName: 'Enquiries 1 month', formula: 'enquiries1m <= maxEnquiries1month' },
  { step: 19, ruleId: 'PL-ENQ-3M', ruleName: 'Enquiries 3 months', formula: 'enquiries3m <= maxEnquiries3months' },
];

/** BL eligibility pipeline — full 20-step order (matches live RULE_CATALOG / CLAUDE). */
export const BL_PIPELINE = [
  { step: 1, ruleId: 'BL-PRE-ACTIVE', ruleName: 'Lender + criteria active', formula: 'catalog.isActive && criteria.isActive && criteriaExists' },
  { step: 2, ruleId: 'BL-PINCODE', ruleName: 'Zip / pincode coverage', formula: "loanType = 'BL' AND isActive AND (coversAllPincodes OR zipCode === applicantPin)" },
  { step: 3, ruleId: 'BL-CIBIL', ruleName: 'Min CIBIL / FTB', formula: 'cibil >= min OR first_time_borrower_allowed' },
  { step: 4, ruleId: 'BL-CURRENT-OVERDUE', ruleName: 'Current overdue', formula: 'no current overdue accounts (or overdue accepted)' },
  { step: 5, ruleId: 'BL-AGE', ruleName: 'Age', formula: 'minAge <= age <= maxAge' },
  { step: 6, ruleId: 'BL-ENTITY', ruleName: 'Entity type', formula: 'entity IN eligible_entity_types' },
  { step: 7, ruleId: 'BL-TURNOVER', ruleName: 'Annual turnover', formula: 'annualTurnoverInr >= min_annual_turnover' },
  { step: 8, ruleId: 'BL-VINTAGE', ruleName: 'Business vintage', formula: 'businessAgeYears >= min_business_vintage' },
  { step: 9, ruleId: 'BL-AMOUNT', ruleName: 'Loan amount', formula: 'minLoanAmount <= requestedAmount <= maxLoanAmount' },
  { step: 10, ruleId: 'BL-FOIR', ruleName: 'FOIR', formula: 'existingTotalEmi / income <= foir_max' },
  { step: 11, ruleId: 'BL-CC-UTIL', ruleName: 'CCU max (credit card)', formula: 'ccOutstanding / ccLimit <= max_cc_utilization_ratio; SKIP when no CC accounts (ccLimit=0 and ccOutstanding=0)' },
  { step: 12, ruleId: 'BL-DPD-3M', ruleName: 'DPD last 3 months', formula: 'violationCount3m <= max_dpd_count_3_months' },
  { step: 13, ruleId: 'BL-DPD-12M', ruleName: 'DPD last 12 months', formula: 'violationCount12m <= max_dpd_count_12_months' },
  { step: 14, ruleId: 'BL-DPD-DAYS', ruleName: 'Max DPD days', formula: 'maxDpdDays <= max_dpd_days_allowed' },
  { step: 15, ruleId: 'BL-UNSECURED', ruleName: 'Active unsecured (6m)', formula: 'activeUnsecured <= max_active_unsecured_6_months' },
  { step: 16, ruleId: 'BL-ENQ-EXCLUDE', ruleName: 'Enquiry already with lender', formula: 'no self-enquiry in last 3 months' },
  { step: 17, ruleId: 'BL-ENQ-1M', ruleName: 'Enquiries 1 month', formula: 'enquiries1m <= max_enquiries_1_month' },
  { step: 18, ruleId: 'BL-ENQ-3M', ruleName: 'Enquiries 3 months', formula: 'enquiries3m <= max_enquiries_3_months' },
  { step: 19, ruleId: 'BL-AUDITED', ruleName: 'Audited books', formula: 'audited_books_required → auditedBooks must be true' },
  { step: 20, ruleId: 'BL-SETTLED-WO', ruleName: 'Settled / write-off (36m)', formula: 'write-off within 36m gated by settled_write_off_36_months' },
];

export const PL_SCORING_CRITERIA = [
  'CIBIL_SCORE', 'FOIR_CHECK', 'DPD_LAST_3M', 'DPD_LAST_12M', 'CC_UTILIZATION',
  'ACTIVE_UNSECURED', 'ENQUIRIES_3M', 'MONTHLY_INCOME', 'JOB_EXPERIENCE',
  'ROI_COMPETITIVENESS', 'MAX_LOAN_ADEQUACY',
];

/** Full BL scoring catalog codes (weights sum 100; matches seed + fixtures). */
export const BL_SCORING_CRITERIA = [
  'CIBIL_SCORE', 'FOIR_CHECK', 'DPD_LAST_3M', 'DPD_LAST_12M', 'CC_UTILIZATION',
  'ACTIVE_UNSECURED', 'ENQUIRIES_3M', 'ANNUAL_TURNOVER', 'BUSINESS_VINTAGE',
  'ITR_DOCUMENTATION', 'BUSINESS_REGISTRATION_PROOF', 'ROI_COMPETITIVENESS', 'MAX_LOAN_ADEQUACY',
];
