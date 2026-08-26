/**
 * BL eligibility rule catalogue — formulas, conditions, and table.column source mapping.
 * Used by step-wise file logging (docs/business-loan/business-loan-eligibility/eligibility_rules.md).
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
  'BL-PRE-ACTIVE': {
    step: 1,
    ruleId: 'BL-PRE-ACTIVE',
    ruleName: 'Lender + criteria active',
    condition: 'Catalog lender and BL criteria row must both be active',
    formula: 'lenders_catalog.is_active && lenders_criteria_bl.is_active && criteriaExists',
    applicantSources: [],
    thresholdSources: [
      { table: 'lenders_catalog', column: 'is_active' },
      { table: 'lenders_criteria_bl', column: 'is_active' },
      { table: 'lenders_criteria_bl', column: 'lender_code' },
    ],
  },
  'BL-PINCODE': {
    step: 2,
    ruleId: 'BL-PINCODE',
    ruleName: 'Zip / pincode coverage',
    condition: 'Applicant pin must be serviceable for the lender',
    formula: 'covers_all_pincodes OR zip_codes_to_lenders.zip_code = leads.pin_code',
    applicantSources: [{ table: 'leads', column: 'pin_code' }],
    thresholdSources: [
      { table: 'zip_codes_to_lenders', column: 'zip_code' },
      { table: 'zip_codes_to_lenders', column: 'covers_all_pincodes' },
      { table: 'zip_codes_to_lenders', column: 'is_active' },
      { table: 'zip_codes_to_lenders', column: 'lender_code' },
    ],
  },
  'BL-CIBIL': {
    step: 3,
    ruleId: 'BL-CIBIL',
    ruleName: 'Min CIBIL',
    condition: 'CIBIL score must meet lender minimum (non-FTB branch)',
    formula: 'cibil_data.cibil_score >= lenders_criteria_bl.min_cibil',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.cibil_score' },
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_bl', column: 'min_cibil' }],
  },
  'BL-FTB': {
    step: 3,
    ruleId: 'BL-FTB',
    ruleName: 'First-time borrower',
    condition: 'Thin-file / FTB scores use FTB branch; first_time_borrower_allowed must be true',
    formula: 'first_time_borrower_allowed === true',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.cibil_score' },
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'first_time_borrower_allowed' },
    ],
  },
  'BL-CURRENT-OVERDUE': {
    step: 4,
    ruleId: 'BL-CURRENT-OVERDUE',
    ruleName: 'Current overdue',
    condition:
      'If current_overdue=true, overdue is accepted (PASS). If false, latest active-month DPD must be <= 5',
    formula:
      'current_overdue=true → PASS; current_overdue=false → latestDpdDays <= 5 PASS, > 5 FAIL',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
        description: 'Newest / most recent active month DPD — used only when current_overdue=false',
      },
    ],
    thresholdSources: [{ table: 'lenders_criteria_bl', column: 'current_overdue' }],
  },
  'BL-AGE': {
    step: 5,
    ruleId: 'BL-AGE',
    ruleName: 'Age band',
    condition: 'Applicant age on application date must be within lender band',
    formula:
      '(min_age_years null OR age >= min_age_years) AND (max_age_years null OR age <= max_age_years)',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.personalDetails.dob' },
      {
        table: 'loan_applications',
        column: 'created_at',
        description: 'Application date (as-of)',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'min_age_years' },
      { table: 'lenders_criteria_bl', column: 'max_age_years' },
    ],
  },
  'BL-ENTITY': {
    step: 6,
    ruleId: 'BL-ENTITY',
    ruleName: 'Eligible entity type',
    condition: 'Business type must be in lender allow-list (exact phrase)',
    formula: 'form_data.businessDetails.type IN eligible_entity_types',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.businessDetails.type' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'eligible_entity_types' },
    ],
  },
  'BL-TURNOVER': {
    step: 7,
    ruleId: 'BL-TURNOVER',
    ruleName: 'Min annual turnover',
    condition: 'Form turnover (Lakh) converted to ₹ must meet lender minimum (₹)',
    formula: 'form_data.businessDetails.turnover * 100000 >= min_annual_turnover',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.businessDetails.turnover' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'min_annual_turnover' },
    ],
  },
  'BL-VINTAGE': {
    step: 8,
    ruleId: 'BL-VINTAGE',
    ruleName: 'Min vintage',
    condition: 'Business age in years must meet lender minimum',
    formula: 'form_data.businessDetails.age >= min_vintage_years',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.businessDetails.age' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'min_vintage_years' },
    ],
  },
  'BL-AMOUNT': {
    step: 9,
    ruleId: 'BL-AMOUNT',
    ruleName: 'Loan amount band',
    condition: 'Requested loan amount must fall within lender min/max (rupees)',
    formula:
      '(min_loan_amount is null OR loan_applications.loan_amount >= min_loan_amount) AND (max_loan_amount is null OR loan_applications.loan_amount <= max_loan_amount)',
    applicantSources: [{ table: 'loan_applications', column: 'loan_amount' }],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'min_loan_amount' },
      { table: 'lenders_criteria_bl', column: 'max_loan_amount' },
    ],
  },
  'BL-FOIR': {
    step: 10,
    ruleId: 'BL-FOIR',
    ruleName: 'FOIR max (non–credit-card)',
    condition: 'Annualised non-CC EMI vs annual turnover must not exceed foir_max',
    formula:
      'applicantFoir = (SUM(emi_amount WHERE account_type != Credit Card) * 12) / (turnover * 100000); PASS ⇔ applicantFoir <= foir_max',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].emi_amount' },
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].account_type' },
      { table: 'loan_applications', column: 'form_data.businessDetails.turnover' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_bl', column: 'foir_max' }],
  },
  'BL-CC-UTIL': {
    step: 11,
    ruleId: 'BL-CC-UTIL',
    ruleName: 'CCU max (credit card)',
    condition: 'Aggregated CC utilization must not exceed lender ratio',
    formula:
      'per CC: utilize = credit_limit - current_balance; ccOutstanding = SUM(utilize); ccLimit = SUM(credit_limit); ccUtil = ccOutstanding / ccLimit; PASS ⇔ ccUtil <= max_cc_utilization_ratio',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].credit_limit' },
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].current_balance' },
      { table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].account_type' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_cc_utilization_ratio' },
    ],
  },
  'BL-DPD-3M': {
    step: 12,
    ruleId: 'BL-DPD-3M',
    ruleName: 'DPD last 3 months',
    condition:
      'Count per-open-account delay events in last 3m; each (account, month) where dpdDays > max_dpd_days_allowed counts as 1',
    formula: 'violationCount3m <= max_dpd_count_3_months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_dpd_days_allowed' },
      { table: 'lenders_criteria_bl', column: 'max_dpd_count_3_months' },
    ],
  },
  'BL-DPD-12M': {
    step: 13,
    ruleId: 'BL-DPD-12M',
    ruleName: 'DPD last 12 months',
    condition:
      'Same per-account delay-event count as BL-DPD-3M over a 12-month window',
    formula: 'violationCount12m <= max_dpd_count_12_months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_dpd_days_allowed' },
      { table: 'lenders_criteria_bl', column: 'max_dpd_count_12_months' },
    ],
  },
  'BL-DPD-DAYS': {
    step: 14,
    ruleId: 'BL-DPD-DAYS',
    ruleName: 'Max DPD days allowed',
    condition: 'Worst DPD days across open-account payment history must not exceed lender cap',
    formula: 'maxDpdDays <= max_dpd_days_allowed',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_history',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_dpd_days_allowed' },
    ],
  },
  'BL-UNSECURED': {
    step: 15,
    ruleId: 'BL-UNSECURED',
    ruleName: 'Active unsecured count (6 months)',
    condition: 'Bureau unsecured count must not exceed lender cap',
    formula: 'cibil_data.active_unsecured_loan_count <= max_active_unsecured_6_months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.active_unsecured_loan_count',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_active_unsecured_6_months' },
    ],
  },
  'BL-ENQ-EXCLUDE': {
    step: 16,
    ruleId: 'BL-ENQ-EXCLUDE',
    ruleName: 'Enquiry already with that lender (3 months)',
    condition: 'No bureau enquiry member matching this lender in last 3 months',
    formula:
      'no enquiries[] where member matches lenderName/lenderCode AND date_of_enquiry within 3 months',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.enquiries[].member' },
      { table: 'cibil_report_summary', column: 'cibil_data.enquiries[].date_of_enquiry' },
    ],
    thresholdSources: [
      { table: 'lenders_catalog', column: 'lender_code' },
      { table: 'lenders_catalog', column: 'lender_name' },
    ],
  },
  'BL-ENQ-1M': {
    step: 17,
    ruleId: 'BL-ENQ-1M',
    ruleName: 'Enquiry count 1 month',
    condition: 'Count of enquiries in last 1 month must be within cap',
    formula: 'count(enquiries where date_of_enquiry in last 1 month) <= max_enquiries_1_month',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.enquiries[].date_of_enquiry',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_enquiries_1_month' },
    ],
  },
  'BL-ENQ-3M': {
    step: 18,
    ruleId: 'BL-ENQ-3M',
    ruleName: 'Enquiry count 3 months',
    condition: 'Count of enquiries in last 3 months must be within cap',
    formula: 'count(enquiries where date_of_enquiry in last 3 months) <= max_enquiries_3_months',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.enquiries[].date_of_enquiry',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'max_enquiries_3_months' },
    ],
  },
  'BL-AUDITED': {
    step: 19,
    ruleId: 'BL-AUDITED',
    ruleName: 'Audited books',
    condition: 'When lender requires audited books, form flag must be true',
    formula:
      'audited_books_required === false → SKIP; true → form_data.businessDetails.auditedBooks === true',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.businessDetails.auditedBooks' },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'audited_books_required' },
    ],
  },
  'BL-SETTLED-WO': {
    step: 20,
    ruleId: 'BL-SETTLED-WO',
    ruleName: 'Settled / write-off (36 months)',
    condition:
      'If any open account has a write-off amount, check whether payment_start_date is within 36 months of application date',
    formula:
      'hasWriteOff → within 36m + settled_write_off_36_months===true → FAIL; flag false → PASS; no WO → PASS',
    applicantSources: [
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].written_off_amount_total',
      },
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].written_off_amount_principal',
      },
      {
        table: 'cibil_report_summary',
        column: 'cibil_data.open_accounts[].payment_start_date',
        description: 'Pay Start Date',
      },
      {
        table: 'loan_applications',
        column: 'created_at',
        description: 'Application date (as-of)',
      },
    ],
    thresholdSources: [
      { table: 'lenders_criteria_bl', column: 'settled_write_off_36_months' },
    ],
  },
};

/** Pipeline order for remaining-rule resolution on early exit. */
export const PIPELINE_RULE_ORDER = [
  'BL-PRE-ACTIVE',
  'BL-PINCODE',
  'BL-CIBIL',
  'BL-FTB',
  'BL-CURRENT-OVERDUE',
  'BL-AGE',
  'BL-ENTITY',
  'BL-TURNOVER',
  'BL-VINTAGE',
  'BL-AMOUNT',
  'BL-FOIR',
  'BL-CC-UTIL',
  'BL-DPD-3M',
  'BL-DPD-12M',
  'BL-DPD-DAYS',
  'BL-UNSECURED',
  'BL-ENQ-EXCLUDE',
  'BL-ENQ-1M',
  'BL-ENQ-3M',
  'BL-AUDITED',
  'BL-SETTLED-WO',
] as const;

export function getRuleCatalog(ruleId: string): RuleCatalogEntry | undefined {
  return RULE_CATALOG[ruleId];
}
