/**
 * Frontend mirror of src/utils/loan-type.ts (Next cannot import Strapi src/).
 * Keep in sync when codes / labels change.
 */

export const LOAN_TYPE_CODES = ['PL', 'BL', 'HL', 'LAP'] as const;
export type LoanTypeCode = (typeof LOAN_TYPE_CODES)[number];

export const DEFAULT_LOAN_TYPE: LoanTypeCode = 'PL';

const LABEL_BY_CODE: Record<LoanTypeCode, string> = {
  PL: 'Personal Loan',
  BL: 'Business Loan',
  HL: 'Home Loan',
  LAP: 'Loan Against Property',
};

const LEGACY_TO_CODE: Record<string, LoanTypeCode> = {
  pl: 'PL',
  bl: 'BL',
  hl: 'HL',
  lap: 'LAP',
  'personal loan': 'PL',
  'business loan': 'BL',
  'home loan': 'HL',
  'lap loan': 'LAP',
  'lap (loan against property)': 'LAP',
  'loan against property': 'LAP',
};

export function isLoanTypeCode(value: unknown): value is LoanTypeCode {
  return LOAN_TYPE_CODES.includes(String(value ?? '').trim().toUpperCase() as LoanTypeCode);
}

export function normalizeLoanTypeCode(
  input?: string | null
): LoanTypeCode | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (LOAN_TYPE_CODES.includes(upper as LoanTypeCode)) {
    return upper as LoanTypeCode;
  }

  const lower = raw.toLowerCase().replace(/\s+/g, ' ');
  if (LEGACY_TO_CODE[lower]) return LEGACY_TO_CODE[lower];

  if (/business\s*loan/i.test(raw)) return 'BL';
  if (/personal\s*loan/i.test(raw)) return 'PL';
  if (/home\s*loan/i.test(raw)) return 'HL';
  if (/\blap\b/i.test(raw) || /loan\s*against\s*property/i.test(raw)) return 'LAP';

  return null;
}

export function coerceLoanTypeCode(input?: string | null): LoanTypeCode {
  return normalizeLoanTypeCode(input) ?? DEFAULT_LOAN_TYPE;
}

export function loanTypeLabel(codeOrLegacy?: string | null): string {
  const code = normalizeLoanTypeCode(codeOrLegacy);
  if (!code) {
    const raw = String(codeOrLegacy ?? '').trim();
    return raw || LABEL_BY_CODE[DEFAULT_LOAN_TYPE];
  }
  return LABEL_BY_CODE[code];
}

export function isBusinessLoanType(loanType?: string | null): boolean {
  return normalizeLoanTypeCode(loanType) === 'BL';
}

export function isPersonalLoanType(loanType?: string | null): boolean {
  return normalizeLoanTypeCode(loanType) === 'PL';
}

export function isHomeLoanType(loanType?: string | null): boolean {
  return normalizeLoanTypeCode(loanType) === 'HL';
}

export function isLapLoanType(loanType?: string | null): boolean {
  return normalizeLoanTypeCode(loanType) === 'LAP';
}
