import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { publish } from '../event-bus.js';
import {
  CONFIG_DIR,
  FIXTURES_DIR,
  REPORTS_DIR,
  PACKAGE_ROOT,
} from '../paths.js';
import {
  PL_PIPELINE,
  BL_PIPELINE,
  PL_SCORING_CRITERIA,
  BL_SCORING_CRITERIA,
} from '../utils/pipeline-defs.js';
import { generateRunReport } from '../report/generate-run-report.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function emit(event) {
  const payload = { ...event, ts: new Date().toISOString() };
  publish(payload);
  return payload;
}

function ageFromDob(dob) {
  if (!dob) return 35;
  const born = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function evaluatePlStep(ruleId, customer, bureau, failLab) {
  const cibil = bureau.cibil_score ?? customer.cibilScore ?? 0;
  const income = Number(customer.netSalary || customer.monthlyIncome || 0);
  const amount = Number(customer.loanAmount || 0);
  const pin = customer.pincode || customer.propertyAddressPincode || '440001';
  const age = ageFromDob(customer.dob);

  switch (ruleId) {
    case 'PL-PRE-ACTIVE':
      return { result: 'PASS', evaluation: 'catalog.isActive=true && criteria.isActive=true → PASS' };
    case 'PL-PINCODE':
      return { result: 'PASS', evaluation: `zipCode=440001 === applicantPin=${pin} → PASS` };
    case 'PL-CIBIL': {
      const min = failLab ? 800 : 650;
      const ok = cibil >= min;
      return {
        result: ok ? 'PASS' : 'FAIL',
        evaluation: `${cibil} >= ${min} → ${ok ? 'PASS' : 'FAIL'}`,
        reason: ok ? null : 'CIBIL below lender minimum',
      };
    }
    case 'PL-DPD-LATEST':
      return { result: 'PASS', evaluation: '0 <= 30 → PASS' };
    case 'PL-AGE': {
      const ok = age >= 21 && age <= 60;
      return { result: ok ? 'PASS' : 'FAIL', evaluation: `21 <= ${age} <= 60 → ${ok ? 'PASS' : 'FAIL'}` };
    }
    case 'PL-INCOME': {
      const min = 40000;
      const ok = income >= min;
      return {
        result: ok ? 'PASS' : 'FAIL',
        evaluation: `netSalary ${income} >= ${min} → ${ok ? 'PASS' : 'FAIL'}`,
      };
    }
    case 'PL-AMOUNT':
      return { result: 'PASS', evaluation: `50000 <= ${amount} <= 5000000 → PASS` };
    case 'PL-FOIR': {
      const foir = failLab ? 0.65 : 0.35;
      const ok = foir <= 0.5;
      return {
        result: ok ? 'PASS' : 'FAIL',
        evaluation: `emi/income = ${foir} <= 0.5 → ${ok ? 'PASS' : 'FAIL'}`,
        reason: ok ? null : 'FOIR exceeds lender limit',
      };
    }
    default:
      return { result: 'SKIP', evaluation: 'Threshold null or not applicable → SKIP' };
  }
}

function evaluateBlStep(ruleId, customer, bureau, failLab) {
  const turnover = Number(customer.turnover || 0);
  const vintage = Number(customer.businessAge || 0);
  const entity = customer.businessType || 'Proprietorship';

  switch (ruleId) {
    case 'BL-ACTIVE':
      return { result: 'PASS', evaluation: 'active lender → PASS' };
    case 'BL-PINCODE':
      return { result: 'PASS', evaluation: 'pincode serviceable → PASS' };
    case 'BL-CIBIL':
      return { result: 'PASS', evaluation: `${bureau.cibil_score ?? 750} >= 650 → PASS` };
    case 'BL-CURRENT-OVERDUE':
      return { result: 'PASS', evaluation: 'no overdue → PASS' };
    case 'BL-AGE':
      return { result: 'PASS', evaluation: 'age in range → PASS' };
    case 'BL-ENTITY': {
      const ok = !failLab || entity === 'Proprietorship';
      return {
        result: ok ? 'PASS' : 'FAIL',
        evaluation: `${entity} IN eligible types → ${ok ? 'PASS' : 'FAIL'}`,
        reason: ok ? null : 'Entity type not accepted',
      };
    }
    case 'BL-TURNOVER': {
      const min = 25;
      const ok = turnover >= min;
      return {
        result: ok ? 'PASS' : 'FAIL',
        evaluation: `${turnover} Lakh >= ${min} Lakh → ${ok ? 'PASS' : 'FAIL'}`,
      };
    }
    case 'BL-VINTAGE': {
      const min = 3;
      const ok = vintage >= min;
      return {
        result: ok ? 'PASS' : 'FAIL',
        evaluation: `${vintage} years >= ${min} → ${ok ? 'PASS' : 'FAIL'}`,
      };
    }
    case 'BL-AMOUNT':
      return { result: 'PASS', evaluation: 'loan amount in range → PASS' };
    case 'BL-FOIR':
      return { result: 'PASS', evaluation: 'FOIR within limit → PASS' };
    default:
      return { result: 'SKIP', evaluation: 'not evaluated in offline demo → SKIP' };
  }
}

function scoreLender(code, criteria, seed) {
  const scores = {};
  let total = 0;
  for (let i = 0; i < criteria.length; i++) {
    const id = criteria[i];
    const pts = Math.max(0, Math.min(10, 4 + ((seed + i * 7) % 7)));
    scores[id] = pts;
    total += pts;
  }
  return { criterionScores: scores, totalScore: Math.min(100, total) };
}

/**
 * Run offline journey: form → bureau → eligibility → scoring → rank.
 * @param {{ product: string, failLab?: boolean, onEvent?: (e: object) => void }} opts
 */
export async function runOfflineJourney(opts = {}) {
  const product = opts.product || 'personal-loan';
  const failLab = Boolean(opts.failLab);
  const runId = randomUUID();
  const runDir = path.join(REPORTS_DIR, 'runs', runId);
  fs.mkdirSync(runDir, { recursive: true });

  const events = [];
  const record = (e) => {
    const ev = emit(e);
    events.push(ev);
    opts.onEvent?.(ev);
    return ev;
  };

  const customerPath = path.join(CONFIG_DIR, 'customers', `${product}.json`);
  const customer = loadJson(customerPath);
  const bureau = loadJson(path.join(FIXTURES_DIR, 'bureau', 'sample-cibil.json'));
  const isBl = product === 'business-loan';
  const pipeline = isBl ? BL_PIPELINE : PL_PIPELINE;
  const scoringCriteria = isBl ? BL_SCORING_CRITERIA : PL_SCORING_CRITERIA;
  const sampleLenders = isBl
    ? [
        { code: 'SBI', name: 'State Bank of India' },
        { code: 'HDFC', name: 'HDFC Bank' },
        { code: 'ICICI', name: 'ICICI Bank' },
      ]
    : [
        { code: 'SBI', name: 'State Bank of India' },
        { code: 'HDFC', name: 'HDFC Bank' },
        { code: 'AXIS', name: 'Axis Bank' },
        { code: 'ICICI', name: 'ICICI Bank' },
      ];

  record({
    stage: 'form',
    status: 'start',
    message: `Loading ${product} customer fixture`,
    data: { fullName: customer.fullName, loanAmount: customer.loanAmount },
  });
  await sleep(200);

  record({
    stage: 'form',
    status: 'complete',
    message: 'Customer form data ready (offline)',
    data: { fields: Object.keys(customer).length },
  });

  record({
    stage: 'bureau',
    status: 'start',
    message: 'Loading sample bureau extraction fixture',
  });
  await sleep(250);

  record({
    stage: 'bureau',
    status: 'complete',
    message: `Bureau sample loaded — CIBIL ${bureau.cibil_score}`,
    data: { cibil_score: bureau.cibil_score, open_accounts: bureau.open_accounts?.length ?? 0 },
  });

  const lenders = [];
  const evaluate = isBl ? evaluateBlStep : evaluatePlStep;

  record({ stage: 'eligibility', status: 'start', message: 'Running eligibility pipeline (offline simulation)' });

  for (const lender of sampleLenders) {
    const steps = [];
    let eligible = true;
    let failedAt = null;
    let failedStep = null;

    for (const def of pipeline) {
      const ev = evaluate(def.ruleId, customer, bureau, failLab);
      const row = {
        step: def.step,
        ruleId: def.ruleId,
        ruleName: def.ruleName,
        formula: def.formula,
        result: ev.result,
        evaluation: ev.evaluation,
        reason: ev.reason ?? null,
      };
      steps.push(row);

      record({
        stage: 'eligibility',
        status: 'step',
        message: `${lender.code} · ${def.ruleId} → ${ev.result}`,
        data: { lender: lender.code, ...row },
      });
      await sleep(40);

      if (eligible && ev.result === 'FAIL') {
        eligible = false;
        failedAt = def.ruleId;
        failedStep = def.step;
        break;
      }
    }

    const passed = steps.filter((s) => s.result === 'PASS').length;
    const failed = steps.filter((s) => s.result === 'FAIL').length;
    const skipped = steps.filter((s) => s.result === 'SKIP').length;

    lenders.push({
      code: lender.code,
      lenderName: lender.name,
      eligible,
      failedAt,
      failedStep,
      passed,
      failed,
      skipped,
      notRun: pipeline.length - steps.length,
      steps,
    });

    record({
      stage: 'eligibility',
      status: 'lender',
      message: `${lender.code} ${eligible ? 'eligible' : 'not eligible'}`,
      data: { code: lender.code, eligible, failedAt },
    });
  }

  record({ stage: 'eligibility', status: 'complete', message: 'Eligibility complete' });

  const scoring = [];
  record({ stage: 'scoring', status: 'start', message: 'Scoring eligible lenders (offline)' });

  for (const lender of lenders.filter((l) => l.eligible)) {
    const seed = lender.code.charCodeAt(0);
    const summary = scoreLender(lender.code, scoringCriteria, seed);
    scoring.push({
      code: lender.code,
      lenderName: lender.lenderName,
      totalScore: summary.totalScore,
      summary,
    });
    record({
      stage: 'scoring',
      status: 'lender',
      message: `${lender.code} score ${summary.totalScore}`,
      data: { code: lender.code, totalScore: summary.totalScore },
    });
    await sleep(60);
  }

  record({ stage: 'scoring', status: 'complete', message: 'Scoring complete' });

  scoring.sort((a, b) => b.totalScore - a.totalScore);
  scoring.forEach((s, i) => {
    s.rank = i + 1;
    s.displayed = s.totalScore >= 40;
  });

  record({ stage: 'rank', status: 'start', message: 'Ranking lenders' });
  for (const s of scoring) {
    record({
      stage: 'rank',
      status: 'item',
      message: `#${s.rank} ${s.code} — ${s.totalScore} pts`,
      data: s,
    });
    await sleep(30);
  }
  record({ stage: 'rank', status: 'complete', message: 'Ranking complete' });

  const run = {
    meta: {
      runId,
      product,
      leadId: 'offline',
      leadName: customer.fullName,
      source: failLab ? 'offline-fail-lab' : 'offline-journey',
      loanType: isBl ? 'Business Loan' : 'Personal Loan',
      failLab,
      profile: {
        pin: customer.pincode,
        amount: customer.loanAmount,
        cibil: bureau.cibil_score,
      },
    },
    events,
    lenders,
    scoring,
  };

  const eventsPath = path.join(runDir, 'events.json');
  fs.writeFileSync(eventsPath, JSON.stringify(run, null, 2));

  const report = generateRunReport(run, { runDir });
  record({
    stage: 'complete',
    status: 'done',
    message: 'Journey complete — report generated',
    data: { runId, reportPath: report.relativePath },
  });

  return { runId, runDir, eventsPath, reportPath: report.absolutePath, reportUrl: report.relativePath, run };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const product = process.argv[2] || 'personal-loan';
  const failLab = process.argv.includes('--fail-lab');
  runOfflineJourney({ product, failLab })
    .then((r) => {
      console.log(`Run ${r.runId} → ${r.reportPath}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
