/**
 * PL eligibility rule catalogue — formulas, conditions, and table.column source mapping.
 * Used by step-wise JSONL logging (docs/Personal-Loan-Eligibility.md §16).
 */

export interface RuleSourceField {
  table: string;
  column: string;
  description?: string;
}

export interface RuleCatalogEntry {
  step: number;
  ruleId: string;
  ruleName: string;
  condition: string;
  formula: string;
  applicantSources: RuleSourceField[];
  thresholdSources: RuleSourceField[];
}

export const RULE_CATALOG: Record<string, RuleCatalogEntry> = {
  PRE_ACTIVE_LENDERS: {
    step: 1,
    ruleId: 'PRE_ACTIVE_LENDERS',
    ruleName: 'Active lenders',
    condition: 'Catalog lender and PL criteria row must both be active',
    formula: 'lenders_catalog.is_active && lenders_criteria_pl.is_active && criteriaExists',
    applicantSources: [],
    thresholdSources: [
      { table: 'lenders_catalog', column: 'is_active', description: 'Catalog lender active flag' },
      { table: 'lenders_criteria_pl', column: 'is_active', description: 'PL criteria active flag' },
      { table: 'lenders_criteria_pl', column: 'lender_code', description: 'Criteria row must exist for lender' },
    ],
  },
  'A1-14-PINCODE': {
    step: 2,
    ruleId: 'A1-14-PINCODE',
    ruleName: 'Zipcode availability',
    condition: 'Applicant pin must be serviceable when pincode check is required',
    formula: 'covers_all_pincodes OR zip_codes_to_lenders.zip_code = leads.pin_code',
    applicantSources: [{ table: 'leads', column: 'pin_code', description: 'Applicant pin code' }],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'pincode_check_required' },
      { table: 'zip_codes_to_lenders', column: 'zip_code' },
      { table: 'zip_codes_to_lenders', column: 'covers_all_pincodes' },
      { table: 'zip_codes_to_lenders', column: 'is_active' },
    ],
  },
  'A1-01-CIBIL': {
    step: 3,
    ruleId: 'A1-01-CIBIL',
    ruleName: 'Min CIBIL',
    condition: 'CIBIL score must meet lender minimum (non-FTB branch)',
    formula: 'cibil_score >= min_cibil',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.cibil_score', description: 'Bureau CIBIL score' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'min_cibil' }],
  },
  'A1-FTB': {
    step: 3,
    ruleId: 'A1-FTB',
    ruleName: 'First-time borrower',
    condition: 'First-time / thin-file applicant allowed by lender',
    formula: 'first_time_borrower_allowed = true',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts',
        description: 'Derived: no open accounts → first-time borrower',
      },
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.active_unsecured_loan_count',
        description: 'Derived FTB signal',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'first_time_borrower_allowed' }],
  },
  'A1-DPD-LATEST': {
    step: 4,
    ruleId: 'A1-DPD-LATEST',
    ruleName: 'Latest open-account DPD',
    condition:
      'Most recent open-account payment-history month DPD days must not exceed max_dpd_days_allowed (runs before Age)',
    formula: 'latestDpdDays <= max_dpd_days_allowed',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Newest month after max DPD per calendar month across open accounts',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' }],
  },
  'A1-02-AGE': {
    step: 5,
    ruleId: 'A1-02-AGE',
    ruleName: 'Age',
    condition: 'Applicant age must be within lender band',
    formula: 'min_age <= age <= max_age',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.personalDetails.dob', description: 'Loan form DOB' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'min_age' },
      { table: 'lenders_criteria_pl', column: 'max_age' },
    ],
  },
  'A1-03-INCOME': {
    step: 6,
    ruleId: 'A1-03-INCOME',
    ruleName: 'Minimum Monthly Income',
    condition:
      'When hasOtherIncome is true, netSalary + otherIncomeAmount must meet lender minimum; otherwise netSalary alone',
    formula:
      'hasOtherIncome=true → totalMonthlyIncome = netSalary + otherIncomeAmount >= min_monthly_income; hasOtherIncome=false → netSalary >= min_monthly_income; min_monthly_income null → SKIP',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.hasOtherIncome' },
      {
        table: 'loan_applications',
        column: 'form_data.incomeDetails.netSalary',
        description: 'Loan form net salary',
      },
      { table: 'loan_applications', column: 'form_data.incomeDetails.otherIncomeAmount' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'min_monthly_income' }],
  },
  'A1-13-AMOUNT': {
    step: 7,
    ruleId: 'A1-13-AMOUNT',
    ruleName: 'Loan amount',
    condition: 'Requested loan amount must be within lender band',
    formula: 'min_loan_amount <= requested_amount <= max_loan_amount',
    applicantSources: [
      { table: 'leads', column: 'required_amount', description: 'Lead form loan requirement' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'min_loan_amount' },
      { table: 'lenders_criteria_pl', column: 'max_loan_amount' },
    ],
  },
  'A1-15-FOIR': {
    step: 8,
    ruleId: 'A1-15-FOIR',
    ruleName: 'FOIR',
    condition: 'Existing obligation to income ratio must be within lender cap',
    formula: 'existingTotalEmi / netMonthlyIncome <= foir',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].emi_amount',
        description: 'Sum of EMI from non–credit-card open accounts (account_type ≠ Credit Card)',
      },
      { table: 'loan_applications', column: 'form_data.incomeDetails.netSalary', description: 'Net salary (form)' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'foir' }],
  },
  'A1-07-DPD-3M': {
    step: 9,
    ruleId: 'A1-07-DPD-3M',
    ruleName: 'DPD Last 3 Months',
    condition:
      'Months in last 3 months where DPD days > max_dpd_days_allowed must not exceed max_dpd_count_3months',
    formula:
      'dpdViolationCount3Months = count(last 3m where dpdDays > max_dpd_days_allowed); dpdViolationCount3Months <= max_dpd_count_3months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Per-month max DPD days across accounts',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' },
      { table: 'lenders_criteria_pl', column: 'max_dpd_count_3months' },
    ],
  },
  'A1-08-DPD-12M': {
    step: 10,
    ruleId: 'A1-08-DPD-12M',
    ruleName: 'DPD Last 12 Months',
    condition:
      'Months in last 12 months where DPD days > max_dpd_days_allowed must not exceed max_dpd_count_12months',
    formula:
      'dpdViolationCount12Months = count(last 12m where dpdDays > max_dpd_days_allowed); dpdViolationCount12Months <= max_dpd_count_12months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Per-month max DPD days across accounts',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' },
      { table: 'lenders_criteria_pl', column: 'max_dpd_count_12months' },
    ],
  },
  'A1-09-DPD-DAYS': {
    step: 11,
    ruleId: 'A1-09-DPD-DAYS',
    ruleName: 'Max DPD days',
    condition: 'Maximum DPD days on record must not exceed cap',
    formula: 'max_dpd_days <= max_dpd_days_allowed',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Derived max DPD days',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' }],
  },
  'A1-16-CC-UTIL': {
    step: 12,
    ruleId: 'A1-16-CC-UTIL',
    ruleName: 'Credit card utilization',
    condition: 'Credit card utilization ratio must be within lender cap',
    formula: 'ccOutstanding / ccLimit <= maxCCUtilizationRatio',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].account_type',
        description: 'Only accounts where account_type is Credit Card',
      },
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].credit_limit',
        description: 'Per CC: total_credit_card_utilize = credit_limit - current_balance',
      },
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].current_balance',
        description: 'ccOutstanding = SUM(total_credit_card_utilize); ccLimit = SUM(credit_limit)',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_cc_utilization_ratio' }],
  },
  'A1-UNSECURED': {
    step: 13,
    ruleId: 'A1-UNSECURED',
    ruleName: 'Active unsecured accounts',
    condition: 'Active unsecured loan count must not exceed lender cap',
    formula: 'active_unsecured <= max_active_unsecured_account',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.active_unsecured_loan_count' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_active_unsecured_account' }],
  },
  'A1-04-SALARY_TYPE': {
    step: 14,
    ruleId: 'A1-04-SALARY_TYPE',
    ruleName: 'Accepted salary types',
    condition: 'Salary mode must be in lender accepted list',
    formula: 'salary_mode IN accepted_salary_types',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.salaryMode' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'accepted_salary_types' }],
  },
  'A1-05-PF': {
    step: 15,
    ruleId: 'A1-05-PF',
    ruleName: 'PF Deducted',
    condition: 'When lender requires PF deduction, applicant pfDeducted on loan application must be true',
    formula:
      'pf_required = true && pfDeducted = true → PASS; pf_required = true && pfDeducted = false → FAIL; pf_required = false → SKIP',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.pfDeducted' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'pf_required' }],
  },
  'A1-06-EMPLOYMENT': {
    step: 16,
    ruleId: 'A1-06-EMPLOYMENT',
    ruleName: 'Min employment months',
    condition: 'Employment tenure must meet lender minimum',
    formula: 'employment_months >= min_employment_months',
    applicantSources: [
      {
        table: 'loan_applications',
        column: 'form_data.incomeDetails.jobStability',
        description: 'Mapped to months',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'min_employment_months' }],
  },
  'A1-ENQ-EXCLUDE': {
    step: 17,
    ruleId: 'A1-ENQ-EXCLUDE',
    ruleName: 'Enquiry already with lender',
    condition: 'No bureau enquiry with this lender in the last 3 months',
    formula: 'NOT EXISTS enquiry (last 3m) WHERE member_name matches lender_name OR lender_code',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.enquiries[].member_name',
        description: 'Enquiry members in last 3 months only',
      },
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.enquiries[].date_of_enquiry',
        description: 'Enquiry date must be within last 3 months',
      },
    ],
    thresholdSources: [
      { table: 'lenders_catalog', column: 'lender_name' },
      { table: 'lenders_catalog', column: 'lender_code' },
    ],
  },
  'A1-11-ENQ-1M': {
    step: 18,
    ruleId: 'A1-11-ENQ-1M',
    ruleName: 'Enquiries 1 month',
    condition: 'Enquiry count in last 1 month must not exceed cap',
    formula: 'enquiries_1m <= max_enquiries_1month',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.enquiries[].date_of_enquiry',
        description: 'Derived 1m enquiry count',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_enquiries_1month' }],
  },
  'A1-12-ENQ-3M': {
    step: 19,
    ruleId: 'A1-12-ENQ-3M',
    ruleName: 'Enquiries 3 months',
    condition: 'Enquiry count in last 3 months must not exceed cap',
    formula: 'enquiries_3m <= max_enquiries_3months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.enquiries[].date_of_enquiry',
        description: 'Derived 3m enquiry count',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_enquiries_3months' }],
  },
};

/** Pipeline order for remaining-rule resolution on early exit. */
export const PIPELINE_RULE_ORDER = [
  'PRE_ACTIVE_LENDERS',
  'A1-14-PINCODE',
  'A1-01-CIBIL',
  'A1-FTB',
  'A1-DPD-LATEST',
  'A1-02-AGE',
  'A1-03-INCOME',
  'A1-13-AMOUNT',
  'A1-15-FOIR',
  'A1-07-DPD-3M',
  'A1-08-DPD-12M',
  'A1-09-DPD-DAYS',
  'A1-16-CC-UTIL',
  'A1-UNSECURED',
  'A1-04-SALARY_TYPE',
  'A1-05-PF',
  'A1-06-EMPLOYMENT',
  'A1-ENQ-EXCLUDE',
  'A1-11-ENQ-1M',
  'A1-12-ENQ-3M',
] as const;

export function getRuleCatalog(ruleId: string): RuleCatalogEntry | undefined {
  return RULE_CATALOG[ruleId];
}
