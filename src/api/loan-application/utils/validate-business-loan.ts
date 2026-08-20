/**
 * Server-side validation for Business Loan loan-application payloads.
 * Mirrors frontend rules in LoanApplicationForm.getValidationErrors (Business Loan branch).
 */

function hasMediaId(val: unknown): boolean {
  if (val == null || val === '') return false;
  if (Array.isArray(val)) return val.length > 0 && val.every((id) => hasMediaId(id));
  if (typeof val === 'object' && val !== null && 'id' in (val as object)) {
    return hasMediaId((val as { id: unknown }).id);
  }
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) && n > 0;
}

function parsePositiveInt(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeInt(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function slugifyRegProof(name: string): string {
  const slug = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `regProof_${slug || 'Unknown'}`;
}

export function validateBusinessLoanPayload(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (data.loanType !== 'Business Loan') return errors;

  const form = (data.form_data || {}) as Record<string, any>;
  const biz = (form.businessDetails || {}) as Record<string, any>;
  const personal = (form.personalDetails || {}) as Record<string, any>;
  const address = (form.addressDetails || {}) as Record<string, any>;
  const documents: Array<{ key?: string; name?: string }> = Array.isArray(form.documents)
    ? form.documents
    : [];
  const docKeys = new Set(
    documents.map((d) => d.key).filter(Boolean) as string[]
  );

  if (!biz.name) errors.push('Business Name is required.');
  if (!biz.premises) errors.push('Business Premises is required.');
  if (!biz.type) errors.push('Business Type is required.');
  if (parsePositiveInt(biz.turnover) == null) {
    errors.push('Annual Turnover (Lakh) must be a positive whole number.');
  }
  if (parseNonNegativeInt(biz.age) == null) {
    errors.push('Business Age (Years) must be a whole number >= 0.');
  }
  const regProofs: string[] = Array.isArray(biz.regProofs) ? biz.regProofs : [];
  if (regProofs.length === 0) {
    errors.push('Select at least one Business Registration Proof.');
  }
  if (biz.auditedBooks !== true && biz.auditedBooks !== false) {
    errors.push('Audited Books (Yes/No) is required.');
  }
  if (!biz.address) errors.push('Business Address is required.');

  if (!personal.dob) errors.push('Date of Birth is required.');
  if (!personal.maritalStatus) errors.push('Marital Status is required.');
  if (!personal.motherName) errors.push('Mother Name is required.');

  if (!address.line1) errors.push('Address Line 1 is required.');
  if (!address.landmark) errors.push('Landmark is required.');
  if (!address.state) errors.push('State is required.');
  if (!address.district) errors.push('District is required.');
  if (!address.city) errors.push('City is required.');
  if (!address.residenceType) errors.push('Residence Type is required.');

  const requiredMedia: Array<{ field: string; label: string }> = [
    { field: 'aadharCardFront', label: 'Aadhaar Card (Front)' },
    { field: 'aadharCardBack', label: 'Aadhaar Card (Back)' },
    { field: 'panCard', label: 'PAN Card' },
    { field: 'cibilReport', label: 'CIBIL Report' },
    { field: 'bankStatement', label: 'Bank Statement' },
    { field: 'itrYear1', label: 'ITR (1st Year)' },
    { field: 'proprietorshipDoc', label: 'Business Type' },
  ];

  for (const { field, label } of requiredMedia) {
    if (!hasMediaId(data[field])) {
      errors.push(`${label} document is required.`);
    }
  }

  if (biz.auditedBooks === true && !hasMediaId(data.auditedBooksDoc)) {
    errors.push('Audited Books document is required when Audited Books = Yes.');
  }

  if (regProofs.length > 0) {
    if (!hasMediaId(data.businessRegProofDoc)) {
      errors.push('All selected Business Registration Proof documents must be uploaded.');
    } else {
      const ids = Array.isArray(data.businessRegProofDoc)
        ? data.businessRegProofDoc
        : [data.businessRegProofDoc];
      if (ids.length < regProofs.length) {
        errors.push(
          `Expected ${regProofs.length} Business Registration Proof upload(s); received ${ids.length}.`
        );
      }
    }
    // Prefer form_data.documents keys when present
    for (const proof of regProofs) {
      const key = slugifyRegProof(proof);
      if (docKeys.size > 0 && !docKeys.has(key)) {
        errors.push(`Missing upload metadata for Business Registration Proof: ${proof}.`);
      }
    }
  }

  return errors;
}
