/** Parse PL/BL eligibility / scoring file logs (lender = CODE {json} blocks). */

const LEGACY_RULE_ID_ALIASES = {
  PRE_ACTIVE_LENDERS: 'PL-PRE-ACTIVE',
  'A1-14-PINCODE': 'PL-PINCODE',
  'A1-01-CIBIL': 'PL-CIBIL',
  'A1-FTB': 'PL-FTB',
  'A1-DPD-LATEST': 'PL-DPD-LATEST',
  'A1-02-AGE': 'PL-AGE',
  'A1-03-INCOME': 'PL-INCOME',
  'A1-13-AMOUNT': 'PL-AMOUNT',
  'A1-15-FOIR': 'PL-FOIR',
  'A1-07-DPD-3M': 'PL-DPD-3M',
  'A1-08-DPD-12M': 'PL-DPD-12M',
  'A1-09-DPD-DAYS': 'PL-DPD-DAYS',
  'A1-16-CC-UTIL': 'PL-CC-UTIL',
  'A1-UNSECURED': 'PL-UNSECURED',
  'A1-04-SALARY_TYPE': 'PL-SALARY-TYPE',
  'A1-05-PF': 'PL-PF',
  'A1-06-EMPLOYMENT': 'PL-EMPLOYMENT',
  'A1-ENQ-EXCLUDE': 'PL-ENQ-EXCLUDE',
  'A1-11-ENQ-1M': 'PL-ENQ-1M',
  'A1-12-ENQ-3M': 'PL-ENQ-3M',
};

export function normalizeRuleId(ruleId) {
  if (ruleId == null || ruleId === '') return ruleId;
  return LEGACY_RULE_ID_ALIASES[ruleId] ?? ruleId;
}

function extractJsonObject(raw) {
  let depth = 0;
  let end = null;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') depth += 1;
    else if (raw[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end == null) return null;
  try {
    return JSON.parse(raw.slice(0, end));
  } catch {
    return null;
  }
}

/**
 * Parse scoring disk logs. Real logs use `lender = CODE { ... criteria ... }`.
 * Also accepts legacy `SCORING lender =` prefix.
 * Split-by-block (not a greedy rest-of-file regex) so every lender is kept.
 */
function parseScoringBlocks(text) {
  const lenders = [];
  const blocks = text.split(/^(?:SCORING\s+)?lender\s*=\s*/m).slice(1);
  for (const block of blocks) {
    const m = block.match(/^(.+?)\s*(\{[\s\S]*)/);
    if (!m) continue;
    const code = m[1].trim();
    const data = extractJsonObject(m[2].trim());
    if (!data) continue;
    const looksScored =
      Array.isArray(data.criteria) ||
      data.totalScore != null ||
      data.score != null ||
      data.criterionScores != null ||
      String(data.phase || '').toUpperCase().includes('SCORING');
    if (!looksScored) continue;
    lenders.push({
      code: data.lenderCode || code,
      lenderCode: data.lenderCode || code,
      lenderName: data.lenderName || '',
      rank: data.rank ?? null,
      totalScore: data.totalScore ?? data.score ?? null,
      displayed: data.displayed,
      criteria: data.criteria || data.criterionScores || data.summary?.criterionScores || null,
      formula: data.formula,
      loanType: data.loanType,
      phase: data.phase,
    });
  }
  return lenders;
}

export function parseEligibilityLog(text) {
  const header = {};
  for (const line of text.split('\n').slice(0, 12)) {
    if (line.includes(':') && !line.startsWith('lender') && !line.startsWith('SCORING')) {
      const idx = line.indexOf(':');
      header[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }

  let profile = {};
  try {
    profile = JSON.parse(header.profile || '{}');
  } catch {
    profile = {};
  }

  const blocks = text.split(/^lender = /m).slice(1);
  const lenders = [];

  for (const block of blocks) {
    const m = block.match(/^(.+?)\s*(\{[\s\S]*)/);
    if (!m) continue;
    const code = m[1].trim();
    const data = extractJsonObject(m[2].trim());
    if (!data) continue;
    // Skip scoring-shaped blocks when parsing eligibility (criteria / totalScore only)
    if (Array.isArray(data.criteria) && data.totalScore != null && !data.steps) continue;
    lenders.push({
      code,
      lenderName: data.lenderName,
      eligible: data.eligible,
      failedAt: data.failedAt != null ? normalizeRuleId(data.failedAt) : null,
      failedStep: data.failedStep ?? null,
      errorCode: data.errorCode ?? null,
      passed: data.passed ?? 0,
      failed: data.failed ?? 0,
      skipped: data.skipped ?? 0,
      notRun: data.notRun ?? 0,
      steps: (data.steps || []).map((s) => ({
        step: s.step,
        ruleId: normalizeRuleId(s.ruleId),
        ruleName: s.ruleName,
        result: s.result,
        formula: s.formula,
        applicant: s.applicant ?? null,
        threshold: s.threshold ?? null,
        reason: s.reason ?? null,
        errorCode: s.errorCode ?? null,
        evaluation: s.evaluation ?? null,
      })),
    });
  }

  const scoring = parseScoringBlocks(text);

  return {
    meta: {
      leadId: header.leadId || '',
      leadName: header.leadName || '',
      runId: header.runId || '',
      source: header.source || 'log-replay',
      profile,
      product: header.product || profile.loanType || '',
    },
    lenders,
    scoring,
  };
}

/** Dedicated scoring-log parse — keeps criteria / formulas / totalScore. */
export function parseScoringLog(text) {
  const header = {};
  for (const line of text.split('\n').slice(0, 12)) {
    if (line.includes(':') && !line.startsWith('lender') && !line.startsWith('SCORING')) {
      const idx = line.indexOf(':');
      header[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  const scoring = parseScoringBlocks(text);
  return {
    meta: {
      leadId: header.leadId || '',
      leadName: header.leadName || '',
      runId: header.runId || '',
      loanType: header.loanType || '',
      phase: header.phase || '',
    },
    scoring,
    lenders: scoring,
  };
}

/**
 * Merge scoring-log rows with matched-lenders ranks/scores so the report
 * shows every displayed (+ below-threshold) lender with criteria when available.
 */
export function mergeScoringRows(logRows, matchBody) {
  const byCode = new Map();

  for (const s of logRows || []) {
    const code = s.code || s.lenderCode;
    if (!code) continue;
    const totalScore = s.totalScore ?? s.score ?? null;
    byCode.set(code, {
      rank: s.rank ?? null,
      code,
      lenderName: s.lenderName || '',
      totalScore,
      displayed: s.displayed !== false && totalScore != null && totalScore >= 40,
      criteria: s.criteria || s.criterionScores || null,
      formula: s.formula || null,
    });
  }

  const displayed = matchBody?.lenders || [];
  const below = matchBody?.belowThreshold || [];
  for (const l of displayed) {
    const code = l.lenderCode;
    if (!code) continue;
    const prev = byCode.get(code) || {};
    byCode.set(code, {
      ...prev,
      code,
      lenderName: prev.lenderName || l.lenderName || '',
      totalScore: prev.totalScore ?? l.score ?? null,
      rank: l.rank ?? prev.rank ?? null,
      displayed: true,
      criteria: prev.criteria || null,
    });
  }
  for (const l of below) {
    const code = l.lenderCode;
    if (!code) continue;
    const prev = byCode.get(code) || {};
    byCode.set(code, {
      ...prev,
      code,
      lenderName: prev.lenderName || l.lenderName || '',
      totalScore: prev.totalScore ?? l.score ?? null,
      rank: l.rank ?? prev.rank ?? null,
      displayed: false,
      criteria: prev.criteria || null,
    });
  }

  const list = [...byCode.values()];
  list.sort(
    (a, b) =>
      (a.rank ?? 9999) - (b.rank ?? 9999) ||
      (b.totalScore ?? 0) - (a.totalScore ?? 0) ||
      String(a.code).localeCompare(String(b.code))
  );
  list.forEach((row, i) => {
    if (row.rank == null) row.rank = i + 1;
  });
  return list;
}
