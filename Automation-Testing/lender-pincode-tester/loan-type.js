/**
 * Local loan-type mapping (mirrors src/utils/loan-type.ts — do not import Strapi code).
 */

const CODES = new Set(['PL', 'BL', 'HL', 'LAP']);

const LEGACY_TO_CODE = {
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

/**
 * @param {string|null|undefined} input
 * @returns {'PL'|'BL'|'HL'|'LAP'|null}
 */
export function normalizeLoanTypeCode(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (CODES.has(upper)) return upper;

  const lower = raw.toLowerCase().replace(/\s+/g, ' ');
  if (LEGACY_TO_CODE[lower]) return LEGACY_TO_CODE[lower];

  if (/business\s*loan/i.test(raw)) return 'BL';
  if (/personal\s*loan/i.test(raw)) return 'PL';
  if (/home\s*loan/i.test(raw)) return 'HL';
  if (/\blap\b/i.test(raw) || /loan\s*against\s*property/i.test(raw)) return 'LAP';

  return null;
}

export function isPlOrBl(code) {
  return code === 'PL' || code === 'BL';
}
