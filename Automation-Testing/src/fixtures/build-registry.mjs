/**
 * Build fixtures/coverage-registry.json from production rule catalogs and error-code constants.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRuleCatalog as getPlRuleCatalog } from '../../../src/api/personal-loan-eligibility/utils/rule-catalog.ts';
import { getRuleCatalog as getBlRuleCatalog } from '../../../src/api/business-loan-eligibility/utils/rule-catalog.ts';

import {
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
} from './evaluators.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../../fixtures/coverage-registry.json');

function entryBase(overrides) {
  return {
    status: 'implemented',
    requiresPassFail: true,
    requiresCatalogAssert: false,
    supportsSkip: false,
    ...overrides,
  };
}

function buildEligibilityEntries(product, pipeline, getCatalog) {
  return pipeline.map((ruleId) => {
    const catalog = getCatalog(ruleId);
    return entryBase({
      id: `eligibility:${product}:${ruleId}`,
      type: 'eligibility_rule',
      product,
      ruleId,
      formula: catalog?.formula ?? null,
      docsHint: catalog?.condition ?? catalog?.ruleName ?? ruleId,
      codeSymbol: ruleId,
      supportsSkip: RULES_WITH_SKIP.has(ruleId),
      ftbBranch: FTB_ONLY_RULES.has(ruleId),
    });
  });
}

function buildScoringEntries(product, criterionOrder) {
  return criterionOrder.map((criterionId) =>
    entryBase({
      id: `scoring:${product}:${criterionId}`,
      type: 'scoring_criterion',
      product,
      ruleId: criterionId,
      formula: null,
      docsHint: `Scoring criterion ${criterionId}`,
      codeSymbol: criterionId,
    })
  );
}

function buildErrorEntries(product, errObj, prefix) {
  return Object.entries(errObj).map(([symbol, code]) => ({
    id: `error:${product}:${symbol}`,
    type: 'error_code',
    product,
    ruleId: code,
    formula: null,
    docsHint: `${prefix} error constant ${symbol}`,
    codeSymbol: symbol,
    status: 'implemented',
    requiresPassFail: false,
    requiresCatalogAssert: true,
    supportsSkip: false,
  }));
}

function buildRegistry() {
  const entries = [];

  entries.push(...buildEligibilityEntries('pl', PL_PIPELINE, getPlRuleCatalog));
  entries.push(...buildEligibilityEntries('bl', BL_PIPELINE, getBlRuleCatalog));
  entries.push(...buildScoringEntries('pl', PL_CRITERION_ORDER));
  entries.push(...buildScoringEntries('bl', BL_CRITERION_ORDER));

  entries.push(...buildErrorEntries('pl', PlErr, 'PL eligibility'));
  entries.push(...buildErrorEntries('pl', PlFail, 'PL eligibility fail'));
  entries.push(...buildErrorEntries('pl', PlScoreErr, 'PL scoring'));
  entries.push(...buildErrorEntries('bl', BlErr, 'BL eligibility'));
  entries.push(...buildErrorEntries('bl', BlFail, 'BL eligibility fail'));
  entries.push(...buildErrorEntries('bl', BlScoreErr, 'BL scoring'));

  entries.push(
    entryBase({
      id: 'form:bl:validate-business-loan',
      type: 'form_validation',
      product: 'bl',
      ruleId: 'validateBusinessLoanPayload',
      formula: 'validateBusinessLoanPayload(data) → string[]',
      docsHint: 'Business Loan loan-application server-side validation',
      codeSymbol: 'validateBusinessLoanPayload',
    })
  );

  const bureauDocs = [
    {
      id: 'bureau:shared:MISSING_PDF',
      key: 'MISSING_PDF',
      docsHint: 'CIBIL PDF missing on disk / api_uploads — blocks auto extraction queue',
    },
    {
      id: 'bureau:shared:EXTRACT_FAIL',
      key: 'EXTRACT_FAIL',
      docsHint: 'BUREAU_EXTRACT_FAILED activity / Python extraction failure',
    },
    {
      id: 'bureau:shared:EXTRACT_OK',
      key: 'EXTRACT_OK',
      docsHint: 'BUREAU_EXTRACT_COMPLETED — successful PDF extraction',
    },
  ];

  for (const b of bureauDocs) {
    entries.push({
      id: b.id,
      type: 'bureau_catalog',
      product: 'shared',
      ruleId: b.key,
      formula: null,
      docsHint: b.docsHint,
      codeSymbol: b.key,
      status: 'documented_only',
      requiresPassFail: false,
      requiresCatalogAssert: true,
      supportsSkip: false,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  };
}

const registry = buildRegistry();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
console.log(`Wrote ${registry.entryCount} entries → ${outPath}`);
