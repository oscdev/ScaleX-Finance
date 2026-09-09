/**
 * Build fixtures/pipeline-docs.json — product-scoped field/rule reference for suite Search.
 * Run: npx tsx src/docs/build-pipeline-docs.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RULE_CATALOG as PL_RULE_CATALOG,
  PIPELINE_RULE_ORDER as PL_PIPELINE,
} from '../../../src/api/personal-loan-eligibility/utils/rule-catalog.ts';
import {
  RULE_CATALOG as BL_RULE_CATALOG,
  PIPELINE_RULE_ORDER as BL_PIPELINE,
} from '../../../src/api/business-loan-eligibility/utils/rule-catalog.ts';
import { BL_CRITERION_ORDER } from '../../../src/api/business-loan-scoring-criteria/utils/types.ts';
import {
  getFieldsForFunnel,
  getAppSteps,
} from '../../../src/shared/loan-form/field-schema.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const outPath = join(__dirname, '../../fixtures/pipeline-docs.json');

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

const LEAD_TOP_FIELDS = [
  {
    key: 'fullName',
    label: 'Full Name',
    usedIn: 'POST /api/leads · loan-app applicantName · upload folder name',
  },
  {
    key: 'email',
    label: 'Email',
    usedIn: 'POST /api/leads · loan-app email',
  },
  {
    key: 'mobileNumber',
    label: 'Mobile Number',
    usedIn: 'POST /api/leads · loan-app phone',
  },
  {
    key: 'requiredAmount',
    label: 'Required / Loan Amount',
    usedIn: 'POST /api/leads · loan-app loanAmount · eligibility PL/BL-AMOUNT · scoring MAX_LOAN_ADEQUACY',
  },
  {
    key: 'pinCode',
    label: 'Pin Code',
    usedIn: 'POST /api/leads · eligibility PL/BL-PINCODE · zip_codes_to_lenders',
  },
  {
    key: 'selectedProduct',
    label: 'Selected Product / Loan Type',
    usedIn: 'POST /api/leads · loan-app loanType · routes PL vs BL engines · log folders',
  },
  {
    key: 'panCard',
    label: 'PAN',
    usedIn: 'POST /api/leads · loan-app panNumber · bureau cross-check',
  },
  {
    key: 'aadharCard',
    label: 'Aadhaar',
    usedIn: 'POST /api/leads · loan-app aadharNumber',
  },
  {
    key: 'employmentType',
    label: 'Employment Type',
    usedIn: 'POST /api/leads · funnel occupation (Salaried / Self Employed)',
  },
];

/** PL scoring formulas (aligned with scoring engine + seed weights). */
const PL_SCORING_META = {
  CIBIL_SCORE: {
    name: 'CIBIL Score',
    weight: 20,
    ruleType: 'FORMULA',
    formula:
      'newBorrower → full weight; else min(1, max(0, (cibil_score - min_cibil) / (900 - min_cibil))) * weight',
    applicantSources: [{ table: 'cibil_report_summary', column: 'cibil_data.cibil_score' }],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'min_cibil' },
      { table: 'lender_scoring_criteria', column: 'weight' },
    ],
  },
  FOIR_CHECK: {
    name: 'FOIR Check',
    weight: 15,
    ruleType: 'FORMULA',
    formula: 'weight * (1 - (FOIR * 100) / 80); FOIR = existingTotalEmi / netMonthlyIncome',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'derived EMI / income' },
      { table: 'loan_applications', column: 'form_data.incomeDetails' },
    ],
    thresholdSources: [{ table: 'lender_scoring_criteria', column: 'weight' }],
  },
  DPD_LAST_3M: {
    name: 'DPD Last 3 Months',
    weight: 10,
    ruleType: 'JSON',
    formula: 'pointsFromRulesMap(dpdViolationCount3Months) using catalog rules',
    applicantSources: [{ table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].payment_history' }],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' },
      { table: 'lender_scoring_criteria', column: 'rules' },
    ],
  },
  DPD_LAST_12M: {
    name: 'DPD Last 12 Months',
    weight: 8,
    ruleType: 'JSON',
    formula: 'pointsFromRulesMap(dpdViolationCount12Months) using catalog rules',
    applicantSources: [{ table: 'cibil_report_summary', column: 'cibil_data.open_accounts[].payment_history' }],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_dpd_days_allowed' },
      { table: 'lender_scoring_criteria', column: 'rules' },
    ],
  },
  CC_UTILIZATION: {
    name: 'CC Utilization',
    weight: 5,
    ruleType: 'JSON',
    formula: 'pointsFromRulesMap(ccUtilPct); no CC accounts → 0% band',
    applicantSources: [{ table: 'cibil_report_summary', column: 'cibil_data.open_accounts (CC limits/balances)' }],
    thresholdSources: [{ table: 'lender_scoring_criteria', column: 'rules' }],
  },
  ACTIVE_UNSECURED: {
    name: 'Active Unsecured Loans',
    weight: 5,
    ruleType: 'JSON',
    formula: 'pointsFromRulesMap(activeUnsecuredLoanCount)',
    applicantSources: [
      { table: 'cibil_report_summary', column: 'cibil_data.active_unsecured_loan_count' },
    ],
    thresholdSources: [{ table: 'lender_scoring_criteria', column: 'rules' }],
  },
  ENQUIRIES_3M: {
    name: 'Enquiries (3 Months)',
    weight: 4,
    ruleType: 'JSON',
    formula: 'pointsFromRulesMap(enquiryCount3Months) after enquiry-exclude members',
    applicantSources: [{ table: 'cibil_report_summary', column: 'cibil_data.enquiries' }],
    thresholdSources: [{ table: 'lender_scoring_criteria', column: 'rules' }],
  },
  MONTHLY_INCOME: {
    name: 'Monthly Income vs Threshold',
    weight: 10,
    ruleType: 'FORMULA',
    formula:
      'min(weight, ((monthlyIncome - min_monthly_income) / (2 * min_monthly_income)) * weight); income = netSalary + otherIncome when hasOtherIncome',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.netSalary' },
      { table: 'loan_applications', column: 'form_data.incomeDetails.otherIncomeAmount' },
    ],
    thresholdSources: [{ table: 'lenders_criteria_pl', column: 'min_monthly_income' }],
  },
  JOB_EXPERIENCE: {
    name: 'Job Experience',
    weight: 7,
    ruleType: 'FORMULA',
    formula: 'points from jobStability (months) vs catalog / hardcoded bands',
    applicantSources: [
      { table: 'loan_applications', column: 'form_data.incomeDetails.jobStability' },
    ],
    thresholdSources: [{ table: 'lender_scoring_criteria', column: 'weight' }],
  },
  ROI_COMPETITIVENESS: {
    name: 'ROI Competitiveness',
    weight: 9,
    ruleType: 'JSON',
    formula: 'pointsFromRulesMap(typicalInterestRatePct)',
    applicantSources: [],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'interest / ROI fields' },
      { table: 'lender_scoring_criteria', column: 'rules' },
    ],
  },
  MAX_LOAN_ADEQUACY: {
    name: 'Max Loan Adequacy',
    weight: 7,
    ruleType: 'JSON+FORMULA',
    formula: 'ratioPct = (loanAmount / maxLoanAmount) * 100; pointsFromRulesMap(ratioPct)',
    applicantSources: [{ table: 'leads', column: 'required_amount / loanAmount' }],
    thresholdSources: [
      { table: 'lenders_criteria_pl', column: 'max_loan_amount' },
      { table: 'lender_scoring_criteria', column: 'rules' },
    ],
  },
};

function formatSources(list) {
  if (!list?.length) return '';
  return list
    .map((s) => `${s.table}.${s.column}${s.description ? ` (${s.description})` : ''}`)
    .join('; ');
}

function itemDescription(parts) {
  return parts.filter(Boolean).join(' · ');
}

function buildLeadItems(productId) {
  const loanType = productId === 'business-loan' ? 'Business Loan' : 'Personal Loan';
  const occupation = productId === 'business-loan' ? 'Self Employed' : 'Salaried';
  const steps = getAppSteps(loanType, occupation);
  const fields = getFieldsForFunnel(
    { loanType, occupation },
    null,
    { ignoreShowWhen: true }
  );

  const items = [];

  for (const f of LEAD_TOP_FIELDS) {
    items.push({
      type: 'lead_field',
      title: f.key,
      description: itemDescription([
        f.label,
        `usedIn: ${f.usedIn}`,
        'form: lead (+ mirrored on loan-app where applicable)',
      ]),
      formula: null,
      sources: [{ table: 'leads', column: f.key }],
      meta: { form: 'lead', step: 'Lead' },
    });
  }

  for (const field of fields) {
    items.push({
      type: 'lead_field',
      title: `${field.section}.${field.key}`,
      description: itemDescription([
        field.label,
        `step: ${field.funnelStep}`,
        `widget: ${field.widget}`,
        `usedIn: loan-app form_data.${field.section}.${field.key} · eligibility/scoring when mapped`,
      ]),
      formula: null,
      sources: [
        {
          table: 'loan_applications',
          column: `form_data.${field.section}.${field.key}`,
        },
      ],
      meta: {
        form: 'loan-application',
        step: field.funnelStep,
        section: field.section,
        funnelSteps: steps,
      },
    });
  }

  return items;
}

function parseBureauFields() {
  const yamlPath = join(
    REPO_ROOT,
    'src/api/bureau-data-extraction/integrations/python/pdf_extractor/configs/fields.yaml'
  );
  const text = readFileSync(yamlPath, 'utf8');
  const extractIdx = text.indexOf('extract:');
  if (extractIdx < 0) return [];
  const rest = text.slice(extractIdx + 'extract:'.length);
  const keyRe = /^  ([a-zA-Z0-9_]+):\s*$/gm;
  const matches = [...rest.matchAll(keyRe)];
  const items = [];

  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1];
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : rest.length;
    const block = rest.slice(start, end);
    const aliases = [];
    let inAliases = false;
    for (const line of block.split('\n')) {
      if (/^\s+aliases:\s*$/.test(line)) {
        inAliases = true;
        continue;
      }
      if (inAliases) {
        const am = line.match(/^\s+-\s+(.+)$/);
        if (am) {
          aliases.push(am[1].trim().replace(/^["']|["']$/g, ''));
        } else if (/^\s+[a-zA-Z_]+\s*:/.test(line) && !/^\s+-/.test(line)) {
          inAliases = false;
        }
      }
    }
    items.push({
      type: 'bureau_field',
      title,
      description: itemDescription([
        aliases.length ? `aliases: ${aliases.join(', ')}` : 'bureau PDF extract field',
        `stored as cibil_data.${title}`,
        'usedIn: eligibility (CIBIL/DPD/FOIR/enq) · scoring · AI Match',
      ]),
      formula: null,
      sources: [{ table: 'cibil_report_summary', column: `cibil_data.${title}` }],
      meta: { aliases },
    });
  }
  return items;
}

function buildEligibilityItems(productId) {
  const isBl = productId === 'business-loan';
  const pipeline = isBl ? BL_PIPELINE : PL_PIPELINE;
  const catalog = isBl ? BL_RULE_CATALOG : PL_RULE_CATALOG;

  return pipeline.map((ruleId, idx) => {
    const entry = catalog[ruleId] || {};
    const app = formatSources(entry.applicantSources);
    const thr = formatSources(entry.thresholdSources);
    return {
      type: 'eligibility_rule',
      title: ruleId,
      description: itemDescription([
        entry.condition || entry.ruleName || ruleId,
        entry.formula ? `formula: ${entry.formula}` : null,
        app ? `applicant: ${app}` : null,
        thr ? `threshold: ${thr}` : null,
        `step: ${entry.step ?? idx + 1}`,
        'result: PASS | FAIL | SKIP → continues or excludes lender until end rank',
      ]),
      formula: entry.formula || null,
      sources: [...(entry.applicantSources || []), ...(entry.thresholdSources || [])],
      meta: {
        step: entry.step ?? idx + 1,
        ruleName: entry.ruleName || ruleId,
        condition: entry.condition || null,
      },
    };
  });
}

function parseBlScoringFromMd() {
  const mdPath = join(
    REPO_ROOT,
    'docs/business-loan/business-loan-scoring/scoring_rules.md'
  );
  const text = readFileSync(mdPath, 'utf8');
  const byCode = {};
  const re = /```json\s*\n(\{[\s\S]*?\})\s*\n```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj.ruleId) byCode[obj.ruleId] = obj;
    } catch {
      /* skip */
    }
  }
  return byCode;
}

function buildScoringItems(productId) {
  const isBl = productId === 'business-loan';
  const order = isBl ? BL_CRITERION_ORDER : PL_CRITERION_ORDER;
  const blDocs = isBl ? parseBlScoringFromMd() : {};

  return order.map((criterionId, idx) => {
    const fromMd = blDocs[criterionId];
    const fromPl = !isBl ? PL_SCORING_META[criterionId] : null;
    const name =
      fromMd?.ruleName || fromPl?.name || criterionId;
    const weight = fromMd?.weight ?? fromPl?.weight ?? null;
    const ruleType = fromMd?.ruleType || fromPl?.ruleType || null;
    const formula = fromMd?.formula || fromPl?.formula || null;
    const applicantSources =
      fromMd?.applicantSources || fromPl?.applicantSources || [];
    const thresholdSources =
      fromMd?.thresholdSources || fromPl?.thresholdSources || [];
    const app = formatSources(applicantSources);
    const thr = formatSources(thresholdSources);

    return {
      type: 'scoring_criterion',
      title: criterionId,
      description: itemDescription([
        name,
        weight != null ? `weight: ${weight}` : null,
        ruleType ? `type: ${ruleType}` : null,
        formula ? `formula: ${formula}` : null,
        app ? `applicant: ${app}` : null,
        thr ? `threshold: ${thr}` : null,
        fromMd?.scoredWhen ? `scoredWhen: ${fromMd.scoredWhen}` : null,
        fromMd?.skipWhen
          ? `skipWhen: ${[].concat(fromMd.skipWhen).join('; ')}`
          : null,
        'result: SCORED points (SKIP = 0) → sum totalScore → RANK (display ≥ 40)',
        `step: ${idx + 1}`,
      ]),
      formula,
      sources: [...applicantSources, ...thresholdSources],
      meta: {
        step: idx + 1,
        weight,
        ruleType,
        name,
        catalogRules: fromMd?.catalogRules ?? null,
      },
    };
  });
}

function buildProduct(productId) {
  return {
    'lead-submission': buildLeadItems(productId),
    bureau: parseBureauFields(),
    eligibility: buildEligibilityItems(productId),
    scoring: buildScoringItems(productId),
  };
}

function build() {
  const docs = {
    generatedAt: new Date().toISOString(),
    products: {
      'personal-loan': buildProduct('personal-loan'),
      'business-loan': buildProduct('business-loan'),
    },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(docs, null, 2));
  const pl = docs.products['personal-loan'];
  const bl = docs.products['business-loan'];
  console.log(
    `Wrote ${outPath}\n` +
      `  PL lead=${pl['lead-submission'].length} bureau=${pl.bureau.length} elig=${pl.eligibility.length} score=${pl.scoring.length}\n` +
      `  BL lead=${bl['lead-submission'].length} bureau=${bl.bureau.length} elig=${bl.eligibility.length} score=${bl.scoring.length}`
  );
}

build();
