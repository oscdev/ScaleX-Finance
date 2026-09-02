/**
 * JSON band lookup: sort digit keys ascending; first N where value <= N → points; else 0.
 */
export function pointsFromRulesMap(
  n: number,
  rules: Record<string, number>
): { points: number; matchedKey: string | null } {
  const digitKeys = Object.keys(rules)
    .filter((k) => /^\d+$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);

  for (const t of digitKeys) {
    if (n <= t) {
      return { points: rules[String(t)], matchedKey: String(t) };
    }
  }
  return { points: 0, matchedKey: null };
}

export function isValidDigitKeyRulesMap(rules: unknown): rules is Record<string, number> {
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return false;
  for (const [k, v] of Object.entries(rules as Record<string, unknown>)) {
    if (!/^\d+$/.test(k)) return false;
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  }
  return true;
}

/** Round half-up to `decimalPlaces` (default 0 = integer). */
export function roundHalfUp(n: number, decimalPlaces = 0): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(n * factor) / factor;
}
