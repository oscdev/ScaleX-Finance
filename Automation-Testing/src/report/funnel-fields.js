/** PL/BL funnel field checklist. `required` matches public loan-application validation. */

export const LEAD_FIELDS = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'mobileNumber', label: 'Mobile Number', required: true },
  { key: 'requiredAmount', label: 'Required Amount', required: true },
  { key: 'pinCode', label: 'Pincode', required: true },
  { key: 'selectedProduct', label: 'Selected Product', required: true },
  { key: 'aadharCard', label: 'Aadhaar', required: true },
  { key: 'panCard', label: 'PAN', required: true },
  { key: 'employmentType', label: 'Employment Type', required: false },
  { key: 'leadType', label: 'Lead Type', required: false },
];

const otherIncomeWhen = { section: 'incomeDetails', key: 'hasOtherIncome', equals: true };

/** @type {Record<string, { step: string, title: string, fields: { section: string, key: string, label: string, required?: boolean, requiredWhen?: object }[] }[]>} */
export const FUNNEL_BY_LOAN_TYPE = {
  'Personal Loan': [
    {
      step: 'Personal',
      title: 'Personal Details',
      fields: [
        { section: 'personalDetails', key: 'dob', label: 'Date of Birth', required: true },
        { section: 'personalDetails', key: 'maritalStatus', label: 'Marital Status', required: true },
        { section: 'personalDetails', key: 'spouseName', label: 'Spouse Name', required: false },
        { section: 'personalDetails', key: 'motherName', label: 'Mother Name', required: true },
        { section: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number', required: false },
        { section: 'personalDetails', key: 'dependents', label: 'Dependents', required: false },
      ],
    },
    {
      step: 'Residence',
      title: 'Residence Details',
      fields: [
        { section: 'addressDetails', key: 'line1', label: 'Address Line 1', required: true },
        { section: 'addressDetails', key: 'line2', label: 'Address Line 2', required: false },
        { section: 'addressDetails', key: 'landmark', label: 'Landmark', required: true },
        { section: 'addressDetails', key: 'state', label: 'State', required: true },
        { section: 'addressDetails', key: 'district', label: 'District', required: true },
        { section: 'addressDetails', key: 'city', label: 'City', required: true },
        { section: 'addressDetails', key: 'residenceType', label: 'Residence Type', required: true },
      ],
    },
    {
      step: 'Income',
      title: 'Income Details',
      fields: [
        { section: 'incomeDetails', key: 'companyName', label: 'Company Name', required: true },
        { section: 'incomeDetails', key: 'designation', label: 'Designation', required: true },
        { section: 'incomeDetails', key: 'companyAddress', label: 'Company Address', required: false },
        { section: 'incomeDetails', key: 'netSalary', label: 'Net Salary (Per Month)', required: true },
        { section: 'incomeDetails', key: 'salaryMode', label: 'Salary Mode', required: true },
        { section: 'incomeDetails', key: 'jobStability', label: 'Current Job Stability (Months)', required: true },
        { section: 'incomeDetails', key: 'pfDeducted', label: 'PF Deducted', required: true },
        { section: 'incomeDetails', key: 'hasOtherIncome', label: 'Other Income', required: true },
        { section: 'incomeDetails', key: 'otherIncomeSource', label: 'Income Source', requiredWhen: otherIncomeWhen },
        { section: 'incomeDetails', key: 'otherIncomeAmount', label: 'Income Amount', requiredWhen: otherIncomeWhen },
      ],
    },
    {
      step: 'Other',
      title: 'Running Loan (If Any)',
      fields: [{ section: 'otherDetails', key: 'runningLoans', label: 'Running Loans', required: false }],
    },
    { step: 'Docs', title: 'Documents', fields: [] },
  ],
  'Business Loan': [
    {
      step: 'Business',
      title: 'Business Details',
      fields: [
        { section: 'businessDetails', key: 'name', label: 'Business Name', required: true },
        { section: 'businessDetails', key: 'premises', label: 'Business Premises', required: true },
        { section: 'businessDetails', key: 'type', label: 'Business Type', required: true },
        { section: 'businessDetails', key: 'turnover', label: 'Annual Turnover (Lakh)', required: true },
        { section: 'businessDetails', key: 'age', label: 'Business Age (Years)', required: true },
        { section: 'businessDetails', key: 'regProofs', label: 'Business Registration Proof', required: true },
        { section: 'businessDetails', key: 'auditedBooks', label: 'Audited Books', required: true },
        { section: 'businessDetails', key: 'address', label: 'Business Address', required: true },
      ],
    },
    {
      step: 'Personal',
      title: 'Personal Details',
      fields: [
        { section: 'personalDetails', key: 'dob', label: 'Date of Birth', required: true },
        { section: 'personalDetails', key: 'maritalStatus', label: 'Marital Status', required: true },
        { section: 'personalDetails', key: 'spouseName', label: 'Spouse Name', required: false },
        { section: 'personalDetails', key: 'motherName', label: 'Mother Name', required: true },
        { section: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number', required: false },
      ],
    },
    {
      step: 'Residence',
      title: 'Residence Details',
      fields: [
        { section: 'addressDetails', key: 'line1', label: 'Address Line 1', required: true },
        { section: 'addressDetails', key: 'line2', label: 'Address Line 2', required: false },
        { section: 'addressDetails', key: 'landmark', label: 'Landmark', required: true },
        { section: 'addressDetails', key: 'state', label: 'State', required: true },
        { section: 'addressDetails', key: 'district', label: 'District', required: true },
        { section: 'addressDetails', key: 'city', label: 'City', required: true },
        { section: 'addressDetails', key: 'residenceType', label: 'Residence Type', required: true },
      ],
    },
    {
      step: 'Other',
      title: 'Running Loan (If Any)',
      fields: [{ section: 'otherDetails', key: 'runningLoans', label: 'Running Loans', required: false }],
    },
    { step: 'Docs', title: 'Documents', fields: [] },
  ],
};

export function getFunnelSteps(loanType) {
  return FUNNEL_BY_LOAN_TYPE[loanType] || FUNNEL_BY_LOAN_TYPE['Personal Loan'];
}

export function isFunnelFieldRequired(field, formData) {
  if (field.requiredWhen) {
    const sec = formData?.[field.requiredWhen.section];
    const val = sec && typeof sec === 'object' ? sec[field.requiredWhen.key] : undefined;
    return val === field.requiredWhen.equals;
  }
  return field.required === true;
}

export function isFunnelFieldEmpty(val) {
  if (val == null || val === '') return true;
  if (Array.isArray(val)) return false;
  if (typeof val === 'boolean') return false;
  return false;
}
