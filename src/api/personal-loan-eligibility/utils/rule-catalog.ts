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
  'PL-PRE-ACTIVE': {
    step: 1,
    ruleId: 'PL-PRE-ACTIVE',
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
  'PL-PINCODE': {
    step: 2,
    ruleId: 'PL-PINCODE',
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
  'PL-CIBIL': {
    step: 3,
    ruleId: 'PL-CIBIL',
    ruleName: 'Min CIBIL',
    condition: 'CIBIL score must meet lender minimum (non-FTB branch)',
    formula: 'cibil_score >= min_cibil',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.cibil_score', description: 'Bureau CIBIL score' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'min_cibil' }],
  },
  'PL-FTB': {
    step: 3,
    ruleId: 'PL-FTB',
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
  'PL-DPD-LATEST': {
    step: 4,
    ruleId: 'PL-DPD-LATEST',
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
  'PL-AGE': {
    step: 5,
    ruleId: 'PL-AGE',
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
  'PL-INCOME': {
    step: 6,
    ruleId: 'PL-INCOME',
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
  'PL-AMOUNT': {
    step: 7,
    ruleId: 'PL-AMOUNT',
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
  'PL-FOIR': {
    step: 8,
    ruleId: 'PL-FOIR',
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
  'PL-DPD-3M': {
    step: 9,
    ruleId: 'PL-DPD-3M',
    ruleName: 'DPD Last 3 Months',
    condition:
      'Account–month delay events in last 3 months where dpdDays > max_dpd_days_allowed must not exceed max_dpd_count_3months (same month on two accounts = 2)',
    formula:
      'dpdViolationCount3Months = count(account–month events in last 3m where dpdDays > max_dpd_days_allowed); dpdViolationCount3Months <= max_dpd_count_3months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Per open-account month cells (not collapsed across accounts)',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' },
      { table: 'lenders_criteria_pl', column: 'max_dpd_count_3months' },
    ],
  },
  'PL-DPD-12M': {
    step: 10,
    ruleId: 'PL-DPD-12M',
    ruleName: 'DPD Last 12 Months',
    condition:
      'Account–month delay events in last 12 months where dpdDays > max_dpd_days_allowed must not exceed max_dpd_count_12months (same month on two accounts = 2)',
    formula:
      'dpdViolationCount12Months = count(account–month events in last 12m where dpdDays > max_dpd_days_allowed); dpdViolationCount12Months <= max_dpd_count_12months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Per open-account month cells (not collapsed across accounts)',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' },
      { table: 'lenders_criteria_pl', column: 'max_dpd_count_12months' },
    ],
  },
  'PL-DPD-DAYS': {
    step: 11,
    ruleId: 'PL-DPD-DAYS',
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
  'PL-CC-UTIL': {
    step: 12,
    ruleId: 'PL-CC-UTIL',
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
  'PL-UNSECURED': {
    step: 13,
    ruleId: 'PL-UNSECURED',
    ruleName: 'Active unsecured accounts',
    condition: 'Active unsecured loan count must not exceed lender cap',
    formula: 'active_unsecured <= max_active_unsecured_account',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.active_unsecured_loan_count' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'max_active_unsecured_account' }],
  },
  'PL-SALARY-TYPE': {
    step: 14,
    ruleId: 'PL-SALARY-TYPE',
    ruleName: 'Accepted salary types',
    condition: 'Salary mode must be in lender accepted list',
    formula: 'salary_mode IN accepted_salary_types',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.salaryMode' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'accepted_salary_types' }],
  },
  'PL-PF': {
    step: 15,
    ruleId: 'PL-PF',
    ruleName: 'PF Deducted',
    condition: 'When lender requires PF deduction, applicant pfDeducted on loan application must be true',
    formula:
      'pf_required = true && pfDeducted = true → PASS; pf_required = true && pfDeducted = false → FAIL; pf_required = false → SKIP',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.pfDeducted' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'pf_required' }],
  },
  'PL-EMPLOYMENT': {
    step: 16,
    ruleId: 'PL-EMPLOYMENT',
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
  'PL-ENQ-EXCLUDE': {
    step: 17,
    ruleId: 'PL-ENQ-EXCLUDE',
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
  'PL-ENQ-1M': {
    step: 18,
    ruleId: 'PL-ENQ-1M',
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
  'PL-ENQ-3M': {
    step: 19,
    ruleId: 'PL-ENQ-3M',
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
  'PL-PRE-ACTIVE',
  'PL-PINCODE',
  'PL-CIBIL',
  'PL-FTB',
  'PL-DPD-LATEST',
  'PL-AGE',
  'PL-INCOME',
  'PL-AMOUNT',
  'PL-FOIR',
  'PL-DPD-3M',
  'PL-DPD-12M',
  'PL-DPD-DAYS',
  'PL-CC-UTIL',
  'PL-UNSECURED',
  'PL-SALARY-TYPE',
  'PL-PF',
  'PL-EMPLOYMENT',
  'PL-ENQ-EXCLUDE',
  'PL-ENQ-1M',
  'PL-ENQ-3M',
] as const;

export function getRuleCatalog(ruleId: string): RuleCatalogEntry | undefined {
  return RULE_CATALOG[ruleId];
}
