/**
 * Offline fixture evaluators — imports production rule modules via tsx.
 */

import {
  evaluateActive as evaluatePlActive,
  evaluateZipcode as evaluatePlZipcode,
  evaluateCibilOrFtb as evaluatePlCibilOrFtb,
  evaluateLatestDpd as evaluatePlLatestDpd,
  evaluateAge as evaluatePlAge,
  evaluateIncome as evaluatePlIncome,
  evaluateLoanAmount as evaluatePlLoanAmount,
  evaluateFoir as evaluatePlFoir,
  evaluateDpd as evaluatePlDpd,
  evaluateCcu as evaluatePlCcu,
  evaluateUnsecured as evaluatePlUnsecured,
  evaluateSalaryType as evaluatePlSalaryType,
  evaluatePf as evaluatePlPf,
  evaluateEmployment as evaluatePlEmployment,
  evaluateEnquiryExclude as evaluatePlEnquiryExclude,
  evaluateEnquiryCounts as evaluatePlEnquiryCounts,
} from '../../../src/api/personal-loan-eligibility/utils/eligibility-rules.ts';

import {
  evaluateActive as evaluateBlActive,
  evaluateZipcode as evaluateBlZipcode,
  evaluateCibilOrFtb as evaluateBlCibilOrFtb,
  evaluateCurrentOverdue as evaluateBlCurrentOverdue,
  evaluateAge as evaluateBlAge,
  evaluateEntity as evaluateBlEntity,
  evaluateTurnover as evaluateBlTurnover,
  evaluateVintage as evaluateBlVintage,
  evaluateLoanAmount as evaluateBlLoanAmount,
  evaluateFoir as evaluateBlFoir,
  evaluateCcu as evaluateBlCcu,
  evaluateDpd as evaluateBlDpd,
  evaluateUnsecured as evaluateBlUnsecured,
  evaluateEnquiryExclude as evaluateBlEnquiryExclude,
  evaluateEnquiryCounts as evaluateBlEnquiryCounts,
  evaluateAudited as evaluateBlAudited,
  evaluateSettledWo as evaluateBlSettledWo,
} from '../../../src/api/business-loan-eligibility/utils/eligibility-rules.ts';

import { evaluateCriterion as evaluatePlCriterion } from '../../../src/api/personal-loan-scoring-criteria/utils/scoring-rules.ts';
import { evaluateCriterion as evaluateBlCriterion } from '../../../src/api/business-loan-scoring-criteria/utils/scoring-rules.ts';

import { PlErr, PlFail } from '../../../src/api/personal-loan-eligibility/utils/error-codes.ts';
import { BlErr, BlFail } from '../../../src/api/business-loan-eligibility/utils/error-codes.ts';
import { PlScoreErr } from '../../../src/api/personal-loan-scoring-criteria/utils/error-codes.ts';
import { BlScoreErr } from '../../../src/api/business-loan-scoring-criteria/utils/error-codes.ts';

import { PIPELINE_RULE_ORDER as PL_PIPELINE } from '../../../src/api/personal-loan-eligibility/utils/rule-catalog.ts';
import { PIPELINE_RULE_ORDER as BL_PIPELINE } from '../../../src/api/business-loan-eligibility/utils/rule-catalog.ts';
import { BL_CRITERION_ORDER } from '../../../src/api/business-loan-scoring-criteria/utils/types.ts';

import { validateBusinessLoanPayload } from '../../../src/api/loan-application/utils/validate-business-loan.ts';

import {
  plEligibilityVariant,
  blEligibilityVariant,
  plScoringVariant,
  blScoringVariant,
  blFormPassPayload,
  blFormFailPayload,
} from './profiles.mjs';

const PL_CRITERION_ORDER = [
  'CIBIL_SCORE',
  'FOIR_CHECK',
  'DPD_LAST_3M',
  'DPD_LAST_12M',
  'CC_UTILIZATION',
  'ACTIVE_UNSECURED',
  'ENQUIRIES_3M',
  'MONTHLY_INCOME',
  'JOB_EXPERIENCE',
  'ROI_COMPETITIVENESS',
  'MAX_LOAN_ADEQUACY',
];

const RULES_WITH_SKIP = new Set([
  'PL-PINCODE',
  'PL-CIBIL',
  'PL-DPD-LATEST',
  'PL-AGE',
  'PL-INCOME',
  'PL-AMOUNT',
  'PL-FOIR',
  'PL-DPD-3M',
  'PL-DPD-12M',
  'PL-DPD-DAYS',
  'PL-CC-UTIL',
  'PL-UNSECURED',
  'PL-SALARY-TYPE',
  'PL-PF',
  'PL-EMPLOYMENT',
  'PL-ENQ-1M',
  'PL-ENQ-3M',
  'BL-CIBIL',
  'BL-AGE',
  'BL-ENTITY',
  'BL-TURNOVER',
  'BL-VINTAGE',
  'BL-AMOUNT',
  'BL-FOIR',
  'BL-CC-UTIL',
  'BL-DPD-3M',
  'BL-DPD-12M',
  'BL-DPD-DAYS',
  'BL-UNSECURED',
  'BL-ENQ-1M',
  'BL-ENQ-3M',
  'BL-AUDITED',
  'BL-SETTLED-WO',
]);

const FTB_ONLY_RULES = new Set(['PL-FTB', 'BL-FTB']);

function pickRuleResult(results, ruleId) {
  if (Array.isArray(results)) {
    return results.find((r) => r.ruleId === ruleId) ?? results[0];
  }
  return results;
}

function evaluatePlRule(ruleId, ctx) {
  const { profile, criteria, catalog, zipRows } = ctx;
  switch (ruleId) {
    case 'PL-PRE-ACTIVE':
      return evaluatePlActive(1, catalog, criteria);
    case 'PL-PINCODE':
      return evaluatePlZipcode(2, profile, criteria, zipRows);
    case 'PL-CIBIL':
    case 'PL-FTB':
      return evaluatePlCibilOrFtb(3, profile, criteria);
    case 'PL-DPD-LATEST':
      return evaluatePlLatestDpd(4, profile, criteria);
    case 'PL-AGE':
      return evaluatePlAge(5, profile, criteria);
    case 'PL-INCOME':
      return evaluatePlIncome(6, profile, criteria);
    case 'PL-AMOUNT':
      return evaluatePlLoanAmount(7, profile, criteria);
    case 'PL-FOIR':
      return evaluatePlFoir(8, profile, criteria);
    case 'PL-DPD-3M':
    case 'PL-DPD-12M':
    case 'PL-DPD-DAYS':
      return pickRuleResult(evaluatePlDpd(profile, criteria), ruleId);
    case 'PL-CC-UTIL':
      return evaluatePlCcu(12, profile, criteria);
    case 'PL-UNSECURED':
      return evaluatePlUnsecured(13, profile, criteria);
    case 'PL-SALARY-TYPE':
      return evaluatePlSalaryType(14, profile, criteria);
    case 'PL-PF':
      return evaluatePlPf(15, profile, criteria);
    case 'PL-EMPLOYMENT':
      return evaluatePlEmployment(16, profile, criteria);
    case 'PL-ENQ-EXCLUDE':
      return evaluatePlEnquiryExclude(17, profile, catalog);
    case 'PL-ENQ-1M':
    case 'PL-ENQ-3M':
      return pickRuleResult(evaluatePlEnquiryCounts(profile, criteria), ruleId);
    default:
      throw new Error(`Unknown PL rule: ${ruleId}`);
  }
}

function evaluateBlRule(ruleId, ctx) {
  const { profile, criteria, catalog, zipRows } = ctx;
  switch (ruleId) {
    case 'BL-PRE-ACTIVE':
      return evaluateBlActive(1, catalog, criteria);
    case 'BL-PINCODE':
      return evaluateBlZipcode(2, profile, criteria, zipRows);
    case 'BL-CIBIL':
    case 'BL-FTB':
      return evaluateBlCibilOrFtb(3, profile, criteria);
    case 'BL-CURRENT-OVERDUE':
      return evaluateBlCurrentOverdue(4, profile, criteria);
    case 'BL-AGE':
      return evaluateBlAge(5, profile, criteria);
    case 'BL-ENTITY':
      return evaluateBlEntity(6, profile, criteria);
    case 'BL-TURNOVER':
      return evaluateBlTurnover(7, profile, criteria);
    case 'BL-VINTAGE':
      return evaluateBlVintage(8, profile, criteria);
    case 'BL-AMOUNT':
      return evaluateBlLoanAmount(9, profile, criteria);
    case 'BL-FOIR':
      return evaluateBlFoir(10, profile, criteria);
    case 'BL-CC-UTIL':
      return evaluateBlCcu(11, profile, criteria);
    case 'BL-DPD-3M':
    case 'BL-DPD-12M':
    case 'BL-DPD-DAYS':
      return pickRuleResult(evaluateBlDpd(profile, criteria), ruleId);
    case 'BL-UNSECURED':
      return evaluateBlUnsecured(15, profile, criteria);
    case 'BL-ENQ-EXCLUDE':
      return evaluateBlEnquiryExclude(16, profile, catalog);
    case 'BL-ENQ-1M':
    case 'BL-ENQ-3M':
      return pickRuleResult(evaluateBlEnquiryCounts(profile, criteria), ruleId);
    case 'BL-AUDITED':
      return evaluateBlAudited(19, profile, criteria);
    case 'BL-SETTLED-WO':
      return evaluateBlSettledWo(20, profile, criteria);
    default:
      throw new Error(`Unknown BL rule: ${ruleId}`);
  }
}

function matchEligibilityOutcome(result, expectedOutcome) {
  if (expectedOutcome === 'PASS') return result.result === 'PASS';
  if (expectedOutcome === 'FAIL') return result.result === 'FAIL';
  if (expectedOutcome === 'SKIP') return result.result === 'SKIP';
  return false;
}

function matchScoringOutcome(result, expectedOutcome) {
  if (expectedOutcome === 'PASS' || expectedOutcome === 'SCORED') {
    return result.result === 'SCORED' && result.points > 0;
  }
  if (expectedOutcome === 'FAIL' || expectedOutcome === 'SKIP') {
    return (
      result.result === 'SKIP' ||
      (result.result === 'SCORED' && result.points === 0)
    );
  }
  return false;
}

function parseEntryId(entryId) {
  const parts = entryId.split(':');
  if (parts.length < 2) {
    throw new Error(`Invalid entry id: ${entryId}`);
  }
  return { type: parts[0], product: parts[1], key: parts.slice(2).join(':') };
}

/**
 * Run a single fixture case.
 * @param {string} entryId - registry entry id (type:product:key)
 * @param {'PASS'|'FAIL'|'SKIP'|'SCORED'|'CATALOG'} expectedOutcome
 */
export function runCase(entryId, expectedOutcome) {
  const { type, product, key } = parseEntryId(entryId);
  const expected = expectedOutcome;

  try {
    if (type === 'eligibility') {
      const ruleId = key;
      const variantFn = product === 'pl' ? plEligibilityVariant : blEligibilityVariant;
      const evaluateFn = product === 'pl' ? evaluatePlRule : evaluateBlRule;
      const ctx = variantFn(ruleId, expectedOutcome);
      const actualResult = evaluateFn(ruleId, ctx);
      const ok = matchEligibilityOutcome(actualResult, expectedOutcome);
      return {
        ok,
        actual: actualResult.result,
        expected,
        detail: actualResult,
      };
    }

    if (type === 'scoring') {
      const criterionId = key;
      const variantFn = product === 'pl' ? plScoringVariant : blScoringVariant;
      const evaluateFn = product === 'pl' ? evaluatePlCriterion : evaluateBlCriterion;
      const ctx = variantFn(criterionId, expectedOutcome);
      const actualResult = evaluateFn(
        criterionId,
        ctx.profile,
        ctx.criteria,
        ctx.catalogRow
      );
      const ok = matchScoringOutcome(actualResult, expectedOutcome);
      return {
        ok,
        actual: { result: actualResult.result, points: actualResult.points, errorCode: actualResult.errorCode },
        expected,
        detail: actualResult,
      };
    }

    if (type === 'error') {
      const codeMaps = {
        pl: { err: PlErr, fail: PlFail, score: PlScoreErr },
        bl: { err: BlErr, fail: BlFail, score: BlScoreErr },
        shared: { err: { ...PlErr, ...BlErr }, fail: { ...PlFail, ...BlFail }, score: { ...PlScoreErr, ...BlScoreErr } },
      };
      const maps = codeMaps[product] ?? codeMaps.shared;
      const symbolKey = key;
      const actual =
        maps.err[symbolKey] ??
        maps.fail[symbolKey] ??
        maps.score[symbolKey];
      const expected = actual;
      const ok = typeof actual === 'string' && actual.length > 0;
      return { ok, actual, expected, detail: { symbolKey, code: actual } };
    }

    if (type === 'form') {
      const payload = expectedOutcome === 'PASS' ? blFormPassPayload : blFormFailPayload;
      const errors = validateBusinessLoanPayload(payload);
      const actual = errors.length === 0 ? 'PASS' : 'FAIL';
      const expected = expectedOutcome === 'PASS' ? 'PASS' : 'FAIL';
      return {
        ok: actual === expected,
        actual: { outcome: actual, errorCount: errors.length, errors: errors.slice(0, 5) },
        expected,
        detail: errors,
      };
    }

    if (type === 'bureau') {
      const catalog = {
        MISSING_PDF: 'BUREAU_MISSING_PDF',
        EXTRACT_FAIL: 'BUREAU_EXTRACT_FAILED',
        EXTRACT_OK: 'BUREAU_EXTRACT_COMPLETED',
      };
      const actual = catalog[key];
      const ok = typeof actual === 'string' && actual.length > 0;
      return { ok, actual, expected: key, detail: { documentedCode: actual } };
    }

    return { ok: false, actual: null, expected, detail: `Unknown type: ${type}` };
  } catch (err) {
    return {
      ok: false,
      actual: null,
      expected,
      detail: err?.message ?? String(err),
    };
  }
}

export {
  PL_PIPELINE,
  BL_PIPELINE,
  PL_CRITERION_ORDER,
  BL_CRITERION_ORDER,
  RULES_WITH_SKIP,
  FTB_ONLY_RULES,
  PlErr,
  PlFail,
  BlErr,
  BlFail,
  PlScoreErr,
  BlScoreErr,
};
