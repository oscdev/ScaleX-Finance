/**
 * Required-field checks for Live Run. Mirrors public lead + loan-application forms
 * (Personal Loan / Business Loan). Throws before any Strapi POST if incomplete.
 */

function hasMediaId(val) {
  if (val == null || val === '') return false;
  if (Array.isArray(val)) return val.length > 0 && val.every((id) => hasMediaId(id));
  if (typeof val === 'object' && val !== null && 'id' in val) return hasMediaId(val.id);
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) && n > 0;
}

function parsePositiveInt(value) {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeInt(value) {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function slugifyRegProof(name) {
  const slug = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `regProof_${slug || 'Unknown'}`;
}

/** Unique emails (name+suite123@…) stay valid. */
function isValidEmail(email) {
  return /^[\w.+-]+@([\w-]+\.)+[\w-]{2,}$/.test(String(email || ''));
}

export function getLeadRequiredErrors(payload) {
  const errors = [];
  const amount = Number(payload?.requiredAmount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push('Loan Requirement is required');
  if (!String(payload?.fullName || '').trim()) errors.push('Customer Name is required');

  const mobile = String(payload?.mobileNumber || '').replace(/\D/g, '');
  if (!mobile) errors.push('Mobile Number is required');
  else if (!/^\d{10}$/.test(mobile)) errors.push('Please enter a valid 10-digit mobile number');

  const pin = String(payload?.pinCode || '').replace(/\D/g, '');
  if (!pin) errors.push('Pin Code is required');
  else if (!/^\d{6}$/.test(pin)) errors.push('Please enter a valid 6-digit pin code');

  if (!payload?.email) errors.push('Email Address is required');
  else if (!isValidEmail(payload.email)) errors.push('Invalid email address');

  const aadhar = String(payload?.aadharCard || '').replace(/\s/g, '');
  if (!aadhar) errors.push('Aadhar Card is required');
  else if (!/^\d{12}$/.test(aadhar)) errors.push('Invalid Aadhar Card');

  const pan = String(payload?.panCard || '').toUpperCase();
  if (!pan) errors.push('Pan Card is required');
  else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) errors.push('Invalid Pan Card');

  return errors;
}

function personalResidenceErrors(personal, address) {
  const errors = [];
  if (!personal.dob) errors.push('Date of Birth is required');
  if (!personal.maritalStatus) errors.push('Marital Status is required');
  if (!personal.motherName) errors.push('Mother Name is required');
  if (!address.line1) errors.push('Address Line 1 is required');
  if (!address.landmark) errors.push('Landmark is required');
  if (!address.state) errors.push('State is required');
  if (!address.district) errors.push('District is required');
  if (!address.city) errors.push('City is required');
  if (!address.residenceType) errors.push('Residence Type is required');
  return errors;
}

export function getLoanAppFormRequiredErrors(payload) {
  const errors = [];
  const loanType = payload?.loanType;
  const form = payload?.form_data || {};
  const personal = form.personalDetails || {};
  const address = form.addressDetails || {};

  if (payload?.declarationAccepted !== true) {
    errors.push('Declaration must be accepted');
  }

  if (loanType === 'Business Loan') {
    const biz = form.businessDetails || {};
    if (!biz.name) errors.push('Business Name is required');
    if (!biz.premises) errors.push('Business Premises is required');
    if (!biz.type) errors.push('Business Type is required');
    if (parsePositiveInt(biz.turnover) == null) {
      errors.push('Annual Turnover (Lakh) must be a positive whole number');
    }
    if (parseNonNegativeInt(biz.age) == null) {
      errors.push('Business Age (Years) must be a whole number >= 0');
    }
    const regProofs = Array.isArray(biz.regProofs) ? biz.regProofs : [];
    if (regProofs.length === 0) errors.push('Select at least one Business Registration Proof');
    if (biz.auditedBooks !== true && biz.auditedBooks !== false) {
      errors.push('Audited Books (Yes/No) is required');
    }
    if (!biz.address) errors.push('Business Address is required');
    errors.push(...personalResidenceErrors(personal, address));
    return errors;
  }

  errors.push(...personalResidenceErrors(personal, address));
  const income = form.incomeDetails || {};
  if (!income.companyName) errors.push('Company Name is required');
  if (!income.designation) errors.push('Designation is required');
  if (!income.netSalary) errors.push('Net Salary is required');
  if (!income.salaryMode) errors.push('Salary Mode is required');
  const months = Number(income.jobStability);
  if (
    income.jobStability === '' ||
    income.jobStability == null ||
    !Number.isInteger(months) ||
    months < 0
  ) {
    errors.push('Current Job Stability (Months) must be a whole number of months');
  }
  if (income.pfDeducted !== true && income.pfDeducted !== false) {
    errors.push('PF Deducted is required');
  }
  if (income.hasOtherIncome !== true && income.hasOtherIncome !== false) {
    errors.push('Other Income is required');
  }
  if (income.hasOtherIncome === true) {
    if (!String(income.otherIncomeSource || '').trim()) {
      errors.push('Income Source is required when Other Income is Yes');
    }
    const otherAmt = parseFloat(income.otherIncomeAmount);
    if (!income.otherIncomeAmount || Number.isNaN(otherAmt) || otherAmt <= 0) {
      errors.push('Income Amount must be greater than 0 when Other Income is Yes');
    }
  }
  return errors;
}

export function getLoanAppMediaRequiredErrors(payload) {
  const errors = [];
  const loanType = payload?.loanType;
  const form = payload?.form_data || {};

  const requiredMedia =
    loanType === 'Business Loan'
      ? [
          ['aadharCardFront', 'Aadhaar Card (Front)'],
          ['aadharCardBack', 'Aadhaar Card (Back)'],
          ['panCard', 'PAN Card'],
          ['cibilReport', 'CIBIL Report'],
          ['bankStatement', 'Bank Statement'],
          ['itrYear1', 'ITR (1st Year)'],
          ['proprietorshipDoc', 'Business Type document'],
        ]
      : [
          ['aadharCardFront', 'Aadhaar Card (Front)'],
          ['aadharCardBack', 'Aadhaar Card (Back)'],
          ['panCard', 'PAN Card'],
          ['cibilReport', 'CIBIL Report'],
          ['bankStatement', '6 Month Bank Statement'],
          ['salarySlips', 'Salary Slip 1 year'],
        ];

  for (const [field, label] of requiredMedia) {
    if (!hasMediaId(payload?.[field])) errors.push(`${label} document is required`);
  }

  if (loanType !== 'Business Loan') return errors;

  const biz = form.businessDetails || {};
  if (biz.auditedBooks === true && !hasMediaId(payload.auditedBooksDoc)) {
    errors.push('Audited Books document is required when Audited Books = Yes');
  }
  const regProofs = Array.isArray(biz.regProofs) ? biz.regProofs : [];
  if (regProofs.length > 0) {
    if (!hasMediaId(payload.businessRegProofDoc)) {
      errors.push('All selected Business Registration Proof documents must be uploaded');
    } else {
      const ids = Array.isArray(payload.businessRegProofDoc)
        ? payload.businessRegProofDoc
        : [payload.businessRegProofDoc];
      if (ids.length < regProofs.length) {
        errors.push(
          `Expected ${regProofs.length} Business Registration Proof upload(s); received ${ids.length}`
        );
      }
    }
    const documents = Array.isArray(form.documents) ? form.documents : [];
    const docKeys = new Set(documents.map((d) => d.key).filter(Boolean));
    if (docKeys.size > 0) {
      for (const proof of regProofs) {
        const key = slugifyRegProof(proof);
        if (!docKeys.has(key)) {
          errors.push(`Missing upload metadata for Business Registration Proof: ${proof}`);
        }
      }
    }
  }
  return errors;
}

export function getRequiredDocFileErrors(uploads) {
  return (uploads || [])
    .filter((u) => !u.exists)
    .map((u) => `Missing document file: ${u.filePath}`);
}

export function assertRequired(errors, stage) {
  if (!errors?.length) return;
  throw new Error(`Cannot POST ${stage}: missing required fields — ${errors.join('; ')}`);
}
