/** PL/BL funnel field checklist mirrored from src/shared/loan-form/field-schema.ts (suite is plain JS). */

export const LEAD_FIELDS = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'mobileNumber', label: 'Mobile Number' },
  { key: 'requiredAmount', label: 'Required Amount' },
  { key: 'pinCode', label: 'Pincode' },
  { key: 'selectedProduct', label: 'Selected Product' },
  { key: 'aadharCard', label: 'Aadhaar' },
  { key: 'panCard', label: 'PAN' },
  { key: 'employmentType', label: 'Employment Type' },
  { key: 'leadType', label: 'Lead Type' },
];

/** @type {Record<string, { step: string, title: string, fields: { section: string, key: string, label: string }[] }[]>} */
export const FUNNEL_BY_LOAN_TYPE = {
  'Personal Loan': [
    {
      step: 'Personal',
      title: 'Personal Details',
      fields: [
        { section: 'personalDetails', key: 'dob', label: 'Date of Birth' },
        { section: 'personalDetails', key: 'maritalStatus', label: 'Marital Status' },
        { section: 'personalDetails', key: 'spouseName', label: 'Spouse Name' },
        { section: 'personalDetails', key: 'motherName', label: 'Mother Name' },
        { section: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number' },
        { section: 'personalDetails', key: 'dependents', label: 'Dependents' },
      ],
    },
    {
      step: 'Residence',
      title: 'Residence Details',
      fields: [
        { section: 'addressDetails', key: 'line1', label: 'Address Line 1' },
        { section: 'addressDetails', key: 'line2', label: 'Address Line 2' },
        { section: 'addressDetails', key: 'landmark', label: 'Landmark' },
        { section: 'addressDetails', key: 'state', label: 'State' },
        { section: 'addressDetails', key: 'district', label: 'District' },
        { section: 'addressDetails', key: 'city', label: 'City' },
        { section: 'addressDetails', key: 'residenceType', label: 'Residence Type' },
      ],
    },
    {
      step: 'Income',
      title: 'Income Details',
      fields: [
        { section: 'incomeDetails', key: 'companyName', label: 'Company Name' },
        { section: 'incomeDetails', key: 'designation', label: 'Designation' },
        { section: 'incomeDetails', key: 'companyAddress', label: 'Company Address' },
        { section: 'incomeDetails', key: 'netSalary', label: 'Net Salary (Per Month)' },
        { section: 'incomeDetails', key: 'salaryMode', label: 'Salary Mode' },
        { section: 'incomeDetails', key: 'jobStability', label: 'Current Job Stability (Months)' },
        { section: 'incomeDetails', key: 'pfDeducted', label: 'PF Deducted' },
        { section: 'incomeDetails', key: 'hasOtherIncome', label: 'Other Income' },
        { section: 'incomeDetails', key: 'otherIncomeSource', label: 'Income Source' },
        { section: 'incomeDetails', key: 'otherIncomeAmount', label: 'Income Amount' },
      ],
    },
    {
      step: 'Other',
      title: 'Running Loan (If Any)',
      fields: [{ section: 'otherDetails', key: 'runningLoans', label: 'Running Loans' }],
    },
    { step: 'Docs', title: 'Documents', fields: [] },
  ],
  'Business Loan': [
    {
      step: 'Business',
      title: 'Business Details',
      fields: [
        { section: 'businessDetails', key: 'name', label: 'Business Name' },
        { section: 'businessDetails', key: 'premises', label: 'Business Premises' },
        { section: 'businessDetails', key: 'type', label: 'Business Type' },
        { section: 'businessDetails', key: 'turnover', label: 'Annual Turnover (Lakh)' },
        { section: 'businessDetails', key: 'age', label: 'Business Age (Years)' },
        { section: 'businessDetails', key: 'regProofs', label: 'Business Registration Proof' },
        { section: 'businessDetails', key: 'auditedBooks', label: 'Audited Books' },
        { section: 'businessDetails', key: 'address', label: 'Business Address' },
      ],
    },
    {
      step: 'Personal',
      title: 'Personal Details',
      fields: [
        { section: 'personalDetails', key: 'dob', label: 'Date of Birth' },
        { section: 'personalDetails', key: 'maritalStatus', label: 'Marital Status' },
        { section: 'personalDetails', key: 'spouseName', label: 'Spouse Name' },
        { section: 'personalDetails', key: 'motherName', label: 'Mother Name' },
        { section: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number' },
      ],
    },
    {
      step: 'Residence',
      title: 'Residence Details',
      fields: [
        { section: 'addressDetails', key: 'line1', label: 'Address Line 1' },
        { section: 'addressDetails', key: 'line2', label: 'Address Line 2' },
        { section: 'addressDetails', key: 'landmark', label: 'Landmark' },
        { section: 'addressDetails', key: 'state', label: 'State' },
        { section: 'addressDetails', key: 'district', label: 'District' },
        { section: 'addressDetails', key: 'city', label: 'City' },
        { section: 'addressDetails', key: 'residenceType', label: 'Residence Type' },
      ],
    },
    {
      step: 'Other',
      title: 'Running Loan (If Any)',
      fields: [{ section: 'otherDetails', key: 'runningLoans', label: 'Running Loans' }],
    },
    { step: 'Docs', title: 'Documents', fields: [] },
  ],
};

export function getFunnelSteps(loanType) {
  return FUNNEL_BY_LOAN_TYPE[loanType] || FUNNEL_BY_LOAN_TYPE['Personal Loan'];
}
