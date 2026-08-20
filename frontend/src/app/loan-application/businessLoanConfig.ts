/** Business Loan funnel config — options, slugs, labels, and form_data shapes. */

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

export type BusinessRegProofOption = (typeof BUSINESS_REG_PROOF_OPTIONS)[number];

/** Stable upload key for a registration proof type, e.g. GST → regProof_GST */
export function slugifyRegProof(name: string): string {
  const slug = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `regProof_${slug || 'Unknown'}`;
}

/** Display label for the Business Type document upload, e.g. "Business Type - Proprietorship". */
export function getBusinessTypeRegDocLabel(businessType?: string): string {
  const selected = String(businessType || '').trim();
  return selected ? `Business Type - ${selected}` : 'Business Type';
}

export const BUSINESS_LOAN_NOTES = {
  businessType:
    'The Business Type document for your selection must be uploaded in the Documents step.',
  businessTypeDoc:
    'Upload the document that matches the Business Type selected in Business Details (separate from Business Registration Proofs below).',
  regProofs:
    'Select at least one valid Business Registration Proof. Each selected proof gets its own upload in the Documents step.',
  auditedBooks:
    'If Yes is selected, the Audited Books document must be uploaded in the Documents step.',
  bankStatement:
    'Preferably upload a Current Account statement. A Savings Account statement is acceptable if a Current Account is not available.',
  itrYear1:
    'Submission of 3 years of ITR is recommended to maximize eligibility across multiple lenders.',
  auditedBooksDoc:
    'Required only when "Audited Books = Yes" is selected in the Business Details step.',
  regProofDocs:
    'Upload the selected Business Registration Proof document. Each selected proof is mandatory.',
} as const;

export interface BusinessDetailsPayload {
  name: string;
  premises: string;
  type: string;
  address: string;
  /** Annual business turnover in Lakh (integer). */
  turnover: number | string;
  /** Business age in years (integer). */
  age: number | string;
  /** Multi-select registration proof types (Business Loan). */
  regProofs?: string[];
  /** Legacy single select (Self Employed / older records). */
  regProof?: string;
  auditedBooks?: boolean;
}

export interface RegProofDocumentMeta {
  proofType: string;
  key: string;
}

export interface BusinessLoanDocField {
  key: string;
  name: string;
  id: string;
  required: boolean;
  note?: string;
}

export function buildBusinessLoanDocFields(
  formData: {
    businessType?: string;
    businessRegProofs?: string[];
    auditedBooks?: boolean | null;
  },
  pageInfo: Record<string, any> = {}
): BusinessLoanDocField[] {
  const fields: BusinessLoanDocField[] = [
    {
      key: 'aadharCardFront',
      name: pageInfo.adharFrontLabel || 'Aadhaar Card (Front)',
      id: '',
      required: true,
    },
    {
      key: 'aadharCardBack',
      name: pageInfo.adharBackLabel || 'Aadhaar Card (Back)',
      id: '',
      required: true,
    },
    {
      key: 'panCard',
      name: pageInfo.panCardLabel || 'PAN Card',
      id: '',
      required: true,
    },
    {
      key: 'cibilReport',
      name: pageInfo.cibilReportLabel || 'CIBIL Report',
      id: '',
      required: true,
    },
    {
      key: 'bankStatement',
      name: pageInfo.bankStatementLabel || 'Bank Statement',
      id: '',
      required: true,
      note: BUSINESS_LOAN_NOTES.bankStatement,
    },
    {
      key: 'itrYear1',
      name: pageInfo.itrYear1Label || 'ITR (1st Year)',
      id: '',
      required: true,
      note: BUSINESS_LOAN_NOTES.itrYear1,
    },
    {
      key: 'itrYear2',
      name: pageInfo.itrYear2Label || 'ITR (2nd Year)',
      id: '',
      required: false,
    },
    {
      key: 'itrYear3',
      name: pageInfo.itrYear3Label || 'ITR (3rd Year)',
      id: '',
      required: false,
    },
    {
      key: 'proprietorshipDoc',
      name: pageInfo.businessTypeDocLabel || getBusinessTypeRegDocLabel(formData.businessType),
      id: '',
      required: true,
      note: BUSINESS_LOAN_NOTES.businessTypeDoc,
    },
  ];

  if (formData.auditedBooks === true) {
    fields.push({
      key: 'auditedBooksDoc',
      name: pageInfo.auditedBooksDocLabel || 'Audited Books',
      id: '',
      required: true,
      note: BUSINESS_LOAN_NOTES.auditedBooksDoc,
    });
  }

  const proofs = formData.businessRegProofs || [];
  proofs.forEach((proof) => {
    fields.push({
      key: slugifyRegProof(proof),
      name: `Business Registration Proof — ${proof}`,
      id: '',
      required: true,
      note: BUSINESS_LOAN_NOTES.regProofDocs,
    });
  });

  // Sequential numbering for currently displayed docs only (no gaps for hidden conditionals)
  return fields.map((field, index) => ({
    ...field,
    id: `#${index + 1}`,
  }));
}

/** Parse a positive integer string for annual turnover (Lakh). */
export function parsePositiveInt(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Parse a non-negative integer for business age in years. */
export function parseNonNegativeInt(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}
