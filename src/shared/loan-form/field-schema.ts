import type { FieldWidget, FunnelContext, FunnelStep, FormFieldDef, FormSectionDef } from './types';

export const BUSINESS_REG_PROOF_OPTIONS = [
  'GST',
  'TIN',
  'MSME',
  'Shop Registration Certificate',
  'Trade License',
  'Fssai License',
  'Udyam Certificate',
  'Gumasta Certificate',
] as const;

const splitOpts = (s: string) => s.split(',').map((o) => o.trim()).filter(Boolean);

export const FIELD_OPTIONS = {
  maritalStatus: splitOpts('Single, Married, Divorced, Widowed'),
  residenceType: splitOpts('Owned, Rented, Parental, Company Accommodation'),
  salaryMode: splitOpts('Account Transfer, Cheque, Cash'),
  businessPremises: splitOpts('Owned, Rented, Lease'),
  businessType: splitOpts(
    'Proprietorship, Partnership, Private Limited, Limited Liability Partnership, Hindu Undivided Family'
  ),
  businessTurnoverLegacy: splitOpts('20 Lakh, 50 Lakh, 80 Lakh, 1 Crore+, 2 Crore+, 3 Crore+, 5 Crore+'),
  businessAgeLegacy: splitOpts('6 Months, 1 years, 2 Years, 3 Years+'),
  propertyType: splitOpts('Residential, Commercial, Industrial'),
  propertyStatus: splitOpts('Constructed, Plot, Boundries'),
  propertyValue: splitOpts('20L, 50L, 75L, 1Cr, 1.5Cr, 2Cr, 3Cr, 4Cr, 5Cr, 5Cr+'),
  runningLoanType: splitOpts(
    'Personal Loan, Business Loan, Home Loan, Loan Against Property, Credit Card, Auto Loan, Bike Loan, Consumer Loan, Gold Loan, Education Loan, Over Draft, Other'
  ),
};

export const FORM_SECTIONS: FormSectionDef[] = [
  { step: 'Business', title: 'Business Details', permissionSection: 'businessInfo', formDataSection: 'businessDetails' },
  { step: 'Personal', title: 'Personal Details', permissionSection: 'personalDetails', formDataSection: 'personalDetails' },
  { step: 'Residence', title: 'Residence Details', permissionSection: 'addressDetails', formDataSection: 'addressDetails' },
  { step: 'Property', title: 'Property Details', permissionSection: 'propertyDetails', formDataSection: 'propertyDetails' },
  { step: 'Income', title: 'Income Details', permissionSection: 'incomeDetails', formDataSection: 'incomeDetails' },
  { step: 'Other', title: 'Running Loan (If Any)', permissionSection: 'runningLoans', formDataSection: 'otherDetails' },
];

export const ALL_FORM_FIELDS: FormFieldDef[] = [
  // Business
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'name', label: 'Business Name', widget: 'text', funnelStep: 'Business', placeholder: 'Enter Business Name' },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'premises', label: 'Business Premises', widget: 'select', options: [...FIELD_OPTIONS.businessPremises], funnelStep: 'Business' },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'type', label: 'Business Type', widget: 'select', options: [...FIELD_OPTIONS.businessType], funnelStep: 'Business' },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'turnover', label: 'Annual Turnover (Lakh)', widget: 'number', funnelStep: 'Business', showForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'turnover', label: 'Annual Turnover', widget: 'select', options: [...FIELD_OPTIONS.businessTurnoverLegacy], funnelStep: 'Business', hideForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'age', label: 'Business Age (Years)', widget: 'number', funnelStep: 'Business', showForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'age', label: 'Business Age', widget: 'select', options: [...FIELD_OPTIONS.businessAgeLegacy], funnelStep: 'Business', hideForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'regProofs', label: 'Business Registration Proof', widget: 'checkboxGroup', options: [...BUSINESS_REG_PROOF_OPTIONS], funnelStep: 'Business', showForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'regProof', label: 'Business Registration Proof', widget: 'select', options: [...BUSINESS_REG_PROOF_OPTIONS], funnelStep: 'Business', hideForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'auditedBooks', label: 'Audited Books', widget: 'radio', funnelStep: 'Business', showForLoanTypes: ['Business Loan'] },
  { section: 'businessDetails', permissionSection: 'businessInfo', key: 'address', label: 'Business Address', widget: 'textarea', funnelStep: 'Business', placeholder: 'Enter full business address' },
  // Personal
  { section: 'personalDetails', permissionSection: 'personalDetails', key: 'dob', label: 'Date of Birth', widget: 'date', funnelStep: 'Personal' },
  { section: 'personalDetails', permissionSection: 'personalDetails', key: 'maritalStatus', label: 'Marital Status', widget: 'select', options: [...FIELD_OPTIONS.maritalStatus], funnelStep: 'Personal' },
  { section: 'personalDetails', permissionSection: 'personalDetails', key: 'spouseName', label: 'Spouse Name', widget: 'text', funnelStep: 'Personal', placeholder: 'Enter Spouse Name' },
  { section: 'personalDetails', permissionSection: 'personalDetails', key: 'motherName', label: 'Mother Name', widget: 'text', funnelStep: 'Personal', placeholder: 'Enter Mother Name' },
  { section: 'personalDetails', permissionSection: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number', widget: 'text', funnelStep: 'Personal', placeholder: 'Enter Alternate Mobile' },
  { section: 'personalDetails', permissionSection: 'personalDetails', key: 'dependents', label: 'Dependent', widget: 'text', funnelStep: 'Personal', hideForLoanTypes: ['Business Loan'], placeholder: 'Enter number of dependents' },
  // Residence
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'line1', label: 'Address Line 1', widget: 'text', funnelStep: 'Residence', placeholder: 'Enter address' },
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'line2', label: 'Address Line 2', widget: 'text', funnelStep: 'Residence', placeholder: 'Enter address line 2' },
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'landmark', label: 'Landmark', widget: 'text', funnelStep: 'Residence', placeholder: 'Enter landmark' },
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'state', label: 'State', widget: 'stateSelect', funnelStep: 'Residence' },
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'district', label: 'District', widget: 'districtSelect', funnelStep: 'Residence' },
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'city', label: 'City', widget: 'text', funnelStep: 'Residence', placeholder: 'Enter city' },
  { section: 'addressDetails', permissionSection: 'addressDetails', key: 'residenceType', label: 'Residence Type', widget: 'select', options: [...FIELD_OPTIONS.residenceType], funnelStep: 'Residence' },
  // Property
  { section: 'propertyDetails', permissionSection: 'propertyDetails', key: 'type', label: 'Property Type', widget: 'select', options: [...FIELD_OPTIONS.propertyType], funnelStep: 'Property' },
  { section: 'propertyDetails', permissionSection: 'propertyDetails', key: 'status', label: 'Property Current Status', widget: 'select', options: [...FIELD_OPTIONS.propertyStatus], funnelStep: 'Property' },
  { section: 'propertyDetails', permissionSection: 'propertyDetails', key: 'value', label: 'Property Value', widget: 'select', options: [...FIELD_OPTIONS.propertyValue], funnelStep: 'Property' },
  { section: 'addressDetails', permissionSection: 'propertyDetails', key: 'propertyAddressPincode', label: 'Property Address With Pincode', widget: 'textarea', funnelStep: 'Property', showForLoanTypes: ['Home Loan'], placeholder: 'Enter full property address with pincode' },
  // Income
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'companyName', label: 'Company Name', widget: 'text', funnelStep: 'Income', placeholder: 'Enter company name' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'designation', label: 'Designation', widget: 'text', funnelStep: 'Income', placeholder: 'Enter designation' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'companyAddress', label: 'Company Address', widget: 'text', funnelStep: 'Income', placeholder: 'Enter company address' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'netSalary', label: 'Net Salary (Per Month)', widget: 'text', funnelStep: 'Income', placeholder: 'Enter net salary' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'salaryMode', label: 'Salary Mode', widget: 'select', options: [...FIELD_OPTIONS.salaryMode], funnelStep: 'Income' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'jobStability', label: 'Current Job Stability (Months)', widget: 'number', funnelStep: 'Income', placeholder: 'e.g. 24' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'pfDeducted', label: 'PF Deducted', widget: 'radio', funnelStep: 'Income' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'hasOtherIncome', label: 'Other Income', widget: 'radio', funnelStep: 'Income' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'otherIncomeSource', label: 'Income Source', widget: 'text', funnelStep: 'Income', showWhen: { section: 'incomeDetails', key: 'hasOtherIncome', equals: true }, placeholder: 'Enter income source' },
  { section: 'incomeDetails', permissionSection: 'incomeDetails', key: 'otherIncomeAmount', label: 'Income Amount', widget: 'number', funnelStep: 'Income', showWhen: { section: 'incomeDetails', key: 'hasOtherIncome', equals: true }, placeholder: 'Enter income amount' },
];

export function getAppSteps(loanType: string, occupation: string): FunnelStep[] {
  const isSelfEmployed = occupation === 'Self Employed';
  const isLAP = loanType === 'LAP' || loanType === 'LAP (Loan Against Property)';

  if (isSelfEmployed && loanType === 'Home Loan') {
    return ['Business', 'Personal', 'Residence', 'Property', 'Other', 'Docs'];
  }
  if (isSelfEmployed && isLAP) {
    return ['Business', 'Personal', 'Residence', 'Other', 'Docs'];
  }

  switch (loanType) {
    case 'Business Loan':
      return ['Business', 'Personal', 'Residence', 'Other', 'Docs'];
    case 'LAP':
    case 'LAP (Loan Against Property)':
      return ['Personal', 'Residence', 'Income', 'Other', 'Docs'];
    case 'Home Loan':
      return ['Personal', 'Residence', 'Property', 'Income', 'Other', 'Docs'];
    case 'Personal Loan':
    default:
      return ['Personal', 'Residence', 'Income', 'Other', 'Docs'];
  }
}

function matchesLoanTypeFilter(
  field: FormFieldDef,
  loanType: string
): boolean {
  if (field.hideForLoanTypes?.includes(loanType)) return false;
  if (field.showForLoanTypes?.length && !field.showForLoanTypes.includes(loanType)) {
    return false;
  }
  return true;
}

function matchesShowWhen(
  field: FormFieldDef,
  formData: Record<string, Record<string, unknown>> | null | undefined
): boolean {
  if (!field.showWhen) return true;
  const section = formData?.[field.showWhen.section];
  const val = section?.[field.showWhen.key];
  return val === field.showWhen.equals;
}

export function getFieldsForFunnel(
  ctx: FunnelContext,
  formData?: Record<string, Record<string, unknown>> | null,
  options?: { ignoreShowWhen?: boolean }
): FormFieldDef[] {
  const steps = getAppSteps(ctx.loanType, ctx.occupation);
  const seen = new Set<string>();

  return ALL_FORM_FIELDS.filter((field) => {
    if (!steps.includes(field.funnelStep)) return false;
    if (!matchesLoanTypeFilter(field, ctx.loanType)) return false;
    if (!options?.ignoreShowWhen && !matchesShowWhen(field, formData)) return false;
    const dedupeKey = `${field.section}:${field.key}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
}

export function getSectionsForFunnel(ctx: FunnelContext): FormSectionDef[] {
  const steps = getAppSteps(ctx.loanType, ctx.occupation);
  return FORM_SECTIONS.filter((s) => steps.includes(s.step));
}

export function readFormFieldValue(
  formData: Record<string, unknown> | null | undefined,
  section: string,
  key: string
): unknown {
  const sec = formData?.[section];
  if (!sec || typeof sec !== 'object') return '';
  return (sec as Record<string, unknown>)[key] ?? '';
}

export function formatFieldDisplayValue(value: unknown, widget: FieldWidget): string {
  if (value === null || value === undefined || value === '') return '';
  if (widget === 'radio') {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
  }
  if (widget === 'checkboxGroup' && Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}
