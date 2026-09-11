import fs from 'node:fs';
import path from 'node:path';
import { REPORTS_DIR, REPO_ROOT, reportProductDir } from '../paths.js';
import { parseScoringLog, mergeScoringRows } from '../utils/log-parse.js';
import {
  LEAD_FIELDS,
  getFunnelSteps,
  isFunnelFieldRequired,
  isFunnelFieldEmpty,
} from './funnel-fields.js';
import { applicantDisplayValue, turnoverLakhToInr } from '../utils/turnover-display.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chip(result) {
  const r = String(result || '').toUpperCase();
  const cls = {
    PASS: 'chip pass',
    FAIL: 'chip fail',
    SKIP: 'chip skip',
    NOT_RUN: 'chip notrun',
    NOT_EVALUATED: 'chip notrun',
    SCORED: 'chip pass',
    OK: 'chip pass',
    ERROR: 'chip fail',
    WARN: 'chip skip',
  }[r] || 'chip';
  return `<span class="${cls}">${escapeHtml(r || '—')}</span>`;
}

function formatVal(v) {
  const display = applicantDisplayValue(v);
  if (display == null || display === '') return '—';
  if (typeof display === 'boolean') return display ? 'Yes' : 'No';
  if (Array.isArray(display)) return display.length ? JSON.stringify(display) : 'None';
  if (typeof display === 'object') return JSON.stringify(display);
  return String(display);
}

/** Prefer evaluation; else applicant vs threshold → result (disk logs often omit evaluation). */
function formatStepCondition(s) {
  if (!s) return '';
  if (s.evaluation) return String(s.evaluation);
  const applicant = applicantDisplayValue(s.applicant != null ? s.applicant : s.applicantValue);
  if (applicant != null || s.threshold != null) {
    return (
      'applicant=' +
      JSON.stringify(applicant) +
      ' vs threshold=' +
      JSON.stringify(s.threshold) +
      ' → ' +
      (s.result || '')
    );
  }
  return '';
}

function formatStepReason(s) {
  if (!s) return '';
  const r = String(s.result || '').toUpperCase();
  if (r === 'FAIL' || r === 'SKIP') {
    return s.reason || s.errorCode || s.reasonDisplay || '—';
  }
  return s.reason || s.errorCode || s.reasonDisplay || '';
}

/** Rules / matched band for eligibility steps or scoring criteria. */
function formatRulesMatched(row) {
  if (!row) return '—';
  if (row.rules != null) {
    return (
      formatVal(row.rules) +
      (row.matchedKey != null ? ` · matched ${String(row.matchedKey)}` : '')
    );
  }
  if (row.matchedKey != null) return `matched ${String(row.matchedKey)}`;
  if (row.branchUsed != null || row.matchMode != null) {
    const parts = [];
    if (row.branchUsed != null) parts.push(`branch=${formatVal(row.branchUsed)}`);
    if (row.matchMode != null) parts.push(`mode=${formatVal(row.matchMode)}`);
    return parts.join(' · ');
  }
  return '—';
}

function readSectionValue(formData, section, key) {
  const sec = formData?.[section];
  if (!sec || typeof sec !== 'object') return undefined;
  return sec[key];
}

function fieldCard(label, value, missing = false) {
  return `<div class="field-card${missing ? ' missing' : ''}">
    <span class="fk">${escapeHtml(label)}</span>
    <span class="fv">${escapeHtml(formatVal(value))}</span>
  </div>`;
}

const RUNNING_LOAN_FIELDS = [
  { key: 'type', label: 'Loan Type' },
  { key: 'bank', label: 'Bank Name' },
  { key: 'amount', label: 'Loan Amount' },
  { key: 'emi', label: 'EMI amount' },
  { key: 'paidEmi', label: 'No of Paid EMI' },
];

function buildRunningLoansHtml(loans) {
  if (!Array.isArray(loans) || loans.length === 0) {
    return '<p class="muted">None</p>';
  }
  const showHeadings = loans.length > 1;
  return loans
    .map((loan, i) => {
      const cards = RUNNING_LOAN_FIELDS.map((f) => fieldCard(f.label, loan?.[f.key])).join('');
      const heading = showHeadings ? `<h3 class="subh">Loan ${i + 1}</h3>` : '';
      return `${heading}<div class="field-grid">${cards}</div>`;
    })
    .join('');
}

function buildFormsSection(run) {
  const loanType = run.meta?.loanType || 'Personal Loan';
  const lead = run.fieldValues?.lead || {};
  const loanApp = run.fieldValues?.loanApp || {};
  const formData = loanApp.form_data || {};
  const steps = getFunnelSteps(loanType);

  const leadCards = LEAD_FIELDS.map((f) => {
    const val = lead[f.key];
    const missing = f.required === true && isFunnelFieldEmpty(val);
    return fieldCard(f.label, val, missing);
  }).join('');

  let stepHtml = '';
  let stepNum = 1;
  for (const step of steps) {
    if (step.step === 'Docs') {
      const docs = run.documents || [];
      const stubs = Array.isArray(formData.documents) ? formData.documents : [];
      let docsInner = '';
      if (docs.length) {
        docsInner = `<div class="doc-grid">${docs
          .map(
            (d) => `<div class="doc-chip ${d.ok === false ? 'fail' : 'ok'}">
              <strong>${escapeHtml(d.field)}</strong>
              <span>${escapeHtml(d.file)}</span>
              <span class="muted">${d.mediaId != null ? `media #${d.mediaId}` : escapeHtml(d.error || '')}</span>
            </div>`
          )
          .join('')}</div>`;
      } else if (stubs.length) {
        docsInner = `<div class="field-grid">${stubs
          .map((d) =>
            fieldCard(
              d.name || d.key || 'Document',
              d.status || d.proofType || '—'
            )
          )
          .join('')}</div>`;
      } else {
        docsInner = '<p class="muted">No documents recorded for this run.</p>';
      }
      stepHtml += `<section class="card funnel-step">
        <h2>${stepNum}. ${escapeHtml(step.title)} <span class="step-tag">${escapeHtml(step.step)}</span></h2>
        ${docsInner}
      </section>`;
      stepNum += 1;
      continue;
    }

    if (step.step === 'Other') {
      const loans = readSectionValue(formData, 'otherDetails', 'runningLoans');
      stepHtml += `<section class="card funnel-step">
        <h2>${stepNum}. ${escapeHtml(step.title)} <span class="step-tag">${escapeHtml(step.step)}</span></h2>
        ${buildRunningLoansHtml(loans)}
      </section>`;
      stepNum += 1;
      continue;
    }

    const cards = step.fields
      .filter((f) => f.requiredWhen == null || isFunnelFieldRequired(f, formData))
      .map((f) => {
        const val = readSectionValue(formData, f.section, f.key);
        const missing = isFunnelFieldRequired(f, formData) && isFunnelFieldEmpty(val);
        const displayVal =
          f.key === 'turnover' && f.section === 'businessDetails'
            ? turnoverLakhToInr(val)
            : val;
        return fieldCard(f.label, displayVal, missing);
      })
      .join('');
    stepHtml += `<section class="card funnel-step">
      <h2>${stepNum}. ${escapeHtml(step.title)} <span class="step-tag">${escapeHtml(step.step)}</span></h2>
      <div class="field-grid">${cards || '<p class="muted">No fields for this step.</p>'}</div>
    </section>`;
    stepNum += 1;
  }

  return `<div id="sec-forms">
    <section class="card">
      <h2>0. Lead form</h2>
      <p class="muted">${escapeHtml(loanType)} — funnel steps below match the selected product.${
        run.meta?.cibilFile
          ? ` CIBIL file: <code>${escapeHtml(run.meta.cibilFile)}</code>.`
          : ''
      }</p>
      <div class="field-grid">${leadCards}</div>
    </section>
    ${stepHtml}
  </div>`;
}

function buildBureauSection(bureau) {
  if (!bureau) return `<section class="card"><h2>3. Bureau extraction</h2><p class="muted">Not run</p></section>`;
  const extracted = bureau.extracted || {};
  const openAccounts = Array.isArray(extracted.open_accounts)
    ? extracted.open_accounts.length
    : extracted.open_accounts_count ?? '—';
  const enquiries = Array.isArray(extracted.enquiries)
    ? extracted.enquiries.length
    : extracted.enquiries_count ?? '—';
  const facts = [
    ['Status', bureau.ok ? 'OK' : 'FAIL'],
    ['CIBIL score', bureau.cibilScore ?? extracted.cibil_score ?? extracted.cibilScore],
    ['Consumer name', extracted.consumer_name || extracted.name],
    ['PAN', extracted.pan_number || extracted.pan],
    ['Open accounts', openAccounts],
    ['Enquiries (recent)', enquiries],
    ['Poll attempts', bureau.attempts],
    ['Error', bureau.error],
  ].filter(([, v]) => v != null && v !== '');

  const factHtml = facts
    .map(([k, v]) => fieldCard(k, v))
    .join('');
  const detailId = 'bureau-json';
  return `<section class="card">
    <h2>3. Bureau extraction</h2>
    <div class="field-grid">${factHtml}</div>
    <button type="button" class="btn ghost toggle-detail" data-target="${detailId}">Show extracted JSON</button>
    <pre class="json-detail hidden" id="${detailId}">${escapeHtml(JSON.stringify(extracted || bureau.raw || {}, null, 2))}</pre>
  </section>`;
}

function lenderIsEligible(lender) {
  if (!lender) return false;
  const steps = lender.fullSteps || lender.steps || [];
  if (steps.some((s) => String(s.result || '').toUpperCase() === 'FAIL')) return false;
  if (lender.failedAt) return false;
  return lender.eligible === true;
}

function eligibilityStats(lenders) {
  const total = lenders?.length || 0;
  let pass = 0;
  let fail = 0;
  for (const l of lenders || []) {
    if (lenderIsEligible(l)) pass += 1;
    else fail += 1;
  }
  return { pass, fail, total };
}

function buildEligibilitySection(lenders, loanType) {
  if (!lenders?.length) {
    return `<p class="muted">No lenders in this run.</p>`;
  }
  const { pass, fail, total } = eligibilityStats(lenders);
  const productLabel = loanType || 'selected product';
  return `<div class="elig-stats" id="elig-stats">
    <div class="elig-stat pass"><div class="v">${pass}</div><div class="l">Eligible (PASS)</div></div>
    <div class="elig-stat fail"><div class="v">${fail}</div><div class="l">Not eligible (FAIL)</div></div>
    <div class="elig-stat"><div class="v">${total}</div><div class="l">Total lenders · ${escapeHtml(productLabel)}</div></div>
  </div>
  <div class="elig-toolbar">
    <label for="lender-filter"><strong>Show</strong></label>
    <select id="lender-filter" aria-label="Filter lenders by eligibility">
      <option value="all">All lenders</option>
      <option value="pass">Eligible only</option>
      <option value="fail">Failed only</option>
    </select>
    <label for="lender-select"><strong>Lender</strong></label>
    <select id="lender-select" aria-label="Select lender for eligibility detail"></select>
    <span id="elig-badge" class="badge"></span>
  </div>
  <p id="elig-callout" class="elig-callout" hidden></p>
  <section class="lender-card" id="elig-panel">
    <header class="lender-head">
      <div>
        <h3 id="elig-title">—</h3>
        <p class="muted" id="elig-meta"></p>
      </div>
      <button type="button" class="btn ghost" id="elig-detail-btn">Show details</button>
    </header>
    <pre class="json-detail hidden" id="elig-json" hidden></pre>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Rule</th><th>Name</th><th>Threshold</th><th>Applicant</th><th>Rules / matched</th><th>Formula</th><th>Result</th><th>Reason</th>
        </tr></thead>
        <tbody id="elig-tbody"></tbody>
      </table>
    </div>
  </section>`;
}

function buildTimeline(events) {
  if (!events?.length) return '<p class="muted">No timeline events.</p>';
  return `<ol class="timeline">${events
    .map(
      (e) => `<li class="tl-${escapeHtml(e.stage || 'event')}">
        <time>${escapeHtml(e.ts || '')}</time>
        <strong>${escapeHtml(e.stage || '')}</strong>
        <span>${escapeHtml(e.message || '')}</span>
      </li>`
    )
    .join('')}</ol>`;
}

function scoreCriteriaRowsHtml(criteria) {
  if (Array.isArray(criteria) && criteria.length) {
    return criteria
      .map((c) => {
        const r = String(c.result || 'SCORED').toUpperCase();
        const reasonCls = r === 'FAIL' || r === 'SKIP' ? 'reason-emphasis' : 'muted';
        const reason = c.reason || c.errorCode || '';
        return `<tr>
          <td><code>${escapeHtml(c.criterionId || c.id || '')}</code></td>
          <td>${escapeHtml(c.weight != null ? c.weight : '—')}</td>
          <td>${escapeHtml(formatVal(c.threshold))}</td>
          <td>${escapeHtml(formatVal(c.applicant ?? c.applicantValue))}</td>
          <td class="muted">${escapeHtml(formatRulesMatched(c))}</td>
          <td class="muted formula">${escapeHtml(c.formula || '')}</td>
          <td>${escapeHtml(c.points != null ? c.points : '—')}</td>
          <td>${chip(c.result || 'SCORED')}</td>
          <td class="${reasonCls}">${escapeHtml(reason)}</td>
        </tr>`;
      })
      .join('');
  }
  return '<tr><td colspan="9" class="muted">No criterion breakdown for this lender — use Show details for JSON</td></tr>';
}

function buildScoringSection(scoring) {
  if (!scoring?.length) {
    return `<div class="card" id="sec-scoring-card">
      <h2>5. Scoring &amp; ranking</h2>
      <p class="muted">No scoring data</p>
    </div>`;
  }

  const withCriteria = scoring.filter(
    (s) => s.criteria && (Array.isArray(s.criteria) ? s.criteria.length : Object.keys(s.criteria).length)
  );
  const shown = scoring.filter((s) => s.displayed && s.totalScore != null && s.totalScore >= 40).length;
  const hasScores = scoring.some((s) => s.totalScore != null && s.totalScore !== '');
  const preferred =
    scoring.find((s) => s.displayed && Array.isArray(s.criteria) && s.criteria.length) ||
    withCriteria[0] ||
    scoring.find((s) => s.displayed) ||
    scoring[0];

  const rankRows = scoring
    .map(
      (s) => `<tr>
        <td>${s.rank != null ? s.rank : '—'}</td>
        <td><strong>${escapeHtml(s.code)}</strong></td>
        <td>${escapeHtml(s.lenderName || '')}</td>
        <td><strong>${s.totalScore != null ? escapeHtml(String(s.totalScore)) : '—'}</strong></td>
        <td>${s.displayed && s.totalScore != null && s.totalScore >= 40 ? chip('PASS') + ' Shown on AI Match' : chip('SKIP') + (s.totalScore == null ? ' No score' : ' Below 40')}</td>
      </tr>`
    )
    .join('');

  const options = scoring
    .map((s) => {
      const label = `${s.code || '?'} — ${s.lenderName || ''} (${s.totalScore != null ? s.totalScore : '?'})${s.displayed ? ' · shown' : ' · below 40'}`;
      const selected = preferred && s.code === preferred.code ? ' selected' : '';
      return `<option value="${escapeHtml(String(s.code))}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');

  const initialCritHtml = scoreCriteriaRowsHtml(preferred?.criteria);
  const initialJson = escapeHtml(JSON.stringify(preferred || {}, null, 2));
  const initialTitle = `${escapeHtml(preferred?.lenderName || preferred?.code || '—')} <span class="code">${escapeHtml(preferred?.code || '')}</span>`;
  const initialMeta = `Total score <strong>${preferred?.totalScore != null ? escapeHtml(String(preferred.totalScore)) : '—'}</strong>${preferred?.rank != null ? ` · rank #${escapeHtml(String(preferred.rank))}` : ''} · ${preferred?.displayed && preferred?.totalScore != null && preferred.totalScore >= 40 ? chip('PASS') + ' Shown on AI Match' : chip('SKIP') + ' Not displayed'}`;
  const initialBadge = preferred?.displayed && preferred?.totalScore != null && preferred.totalScore >= 40
    ? '<span id="score-badge" class="badge yes">Shown (≥40)</span>'
    : '<span id="score-badge" class="badge no">No / low score</span>';

  const warn = !hasScores
    ? `<p class="elig-callout danger">Scoring totals were missing from matched-lenders. Re-run Live Run after Strapi is healthy, or check Errors &amp; warnings.</p>`
    : '';

  return `<div class="card" id="sec-scoring-card">
    <h2>5. Scoring &amp; ranking</h2>
    <p class="muted">Lenders with total score ≥ 40 are shown on the AI Match / lenders page. Pick a lender for criterion formulas and JSON.</p>
    ${warn}
    <div class="elig-stats">
      <div class="elig-stat pass"><div class="v">${shown}</div><div class="l">Shown on AI Match (≥40)</div></div>
      <div class="elig-stat"><div class="v">${withCriteria.length}</div><div class="l">With criterion detail</div></div>
      <div class="elig-stat"><div class="v">${scoring.length}</div><div class="l">Scored lenders</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Rank</th><th>Code</th><th>Lender</th><th>Total score</th><th>AI Match display</th></tr></thead>
      <tbody>${rankRows}</tbody>
    </table></div>
    <div class="elig-toolbar" style="margin-top:16px">
      <label for="score-lender-select"><strong>Lender</strong></label>
      <select id="score-lender-select" aria-label="Select lender for scoring criteria">${options}</select>
      ${initialBadge}
    </div>
    <div class="lender-card" id="score-panel">
      <header class="lender-head">
        <div>
          <h3 id="score-title">${initialTitle}</h3>
          <p class="muted" id="score-meta">${initialMeta}</p>
        </div>
        <button type="button" class="btn ghost" id="score-detail-btn">Show details</button>
      </header>
      <pre class="json-detail hidden" id="score-json" hidden>${initialJson}</pre>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Criterion</th><th>Weight</th><th>Threshold</th><th>Applicant</th>
            <th>Rules / matched</th><th>Formula</th><th>Points</th><th>Result</th><th>Reason</th>
          </tr></thead>
          <tbody id="score-tbody">${initialCritHtml}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function buildErrorsSection(errors) {
  if (!errors?.length) {
    return `<section class="card"><h2>Errors &amp; warnings</h2><p class="muted">No errors or warnings.</p></section>`;
  }
  const items = errors
    .map((e) => {
      const isWarn = e.severity === 'warning';
      return `<div class="error-callout${isWarn ? ' warn' : ''}">
        <strong>${escapeHtml(e.stage || 'error')}</strong>
        ${isWarn ? chip('WARN') : chip('FAIL')}
        <p>${escapeHtml(e.message || '')}</p>
        ${e.field ? `<p class="muted">Field: ${escapeHtml(e.field)}</p>` : ''}
        ${e.lenderCode ? `<p class="muted">Lender: ${escapeHtml(e.lenderCode)}</p>` : ''}
      </div>`;
    })
    .join('');
  return `<section class="card"><h2>Errors &amp; warnings</h2>${items}</section>`;
}

function nav() {
  return `<nav class="sticky-nav">
    <a href="#sec-timeline">Timeline</a>
    <a href="#sec-forms">Forms</a>
    <a href="#sec-bureau">Bureau</a>
    <a href="#sec-eligibility">Eligibility</a>
    <a href="#sec-scoring">Scoring</a>
    <a href="#sec-errors">Errors</a>
  </nav>`;
}

/**
 * Write self-contained HTML report for a run.
 */
export function generateRunReport(run, opts = {}) {
  const runId = run.meta?.runId || 'unknown';
  const productId = opts.productId || run.meta?.product;
  const runDir =
    opts.runDir ||
    (productId ? reportProductDir(productId) : path.join(REPORTS_DIR, 'runs', runId));
  fs.mkdirSync(runDir, { recursive: true });

  const title = `${run.meta?.loanType || 'Loan'} ${run.meta?.mode === 'live' ? 'Live Run' : 'run'} — ${run.meta?.leadName || runId}`;
  const reportMeta = run.meta || {};
  // Re-hydrate bureau for old runs that stored nested extract but marked ok:false
  const runForReport = hydrateRunForReport(run);
  const { httpCapture: _omitHttp, ...runForEmbed } = runForReport;
  const dataJson = JSON.stringify(runForEmbed).replace(/</g, '\\u003c');
  const eligibilityHtml = buildEligibilitySection(
    runForReport.lenders || [],
    runForReport.meta?.loanType || runForReport.meta?.product
  );
  const basePath = process.env.BASE_PATH || '/suite';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${basePath}/styles.css" />
<style>
  .report-wrap { max-width: 1200px; margin: 0 auto; padding: 24px 16px 64px; }
  .report-meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 12px; }
  .sticky-nav { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; background: var(--bg); border-bottom: 1px solid var(--border); margin-bottom: 16px; }
  .sticky-nav a { font-size: 0.78rem; font-weight: 650; text-decoration: none; padding: 4px 10px; border-radius: 999px; background: var(--accent-light); color: var(--accent-dark); }
  .elig-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 0 0 12px; }
  .elig-toolbar select { min-width: min(100%, 280px); padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); font-size: 0.95rem; }
  #lender-select { min-width: min(100%, 360px); }
  .elig-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0 0 14px; }
  @media (max-width: 720px) { .elig-stats { grid-template-columns: 1fr; } }
  .elig-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
  .elig-stat .v { font-size: 1.4rem; font-weight: 700; }
  .elig-stat .l { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
  .elig-stat.pass .v { color: #1f7a4d; }
  .elig-stat.fail .v { color: #b42318; }
  .elig-summary { font-size: 0.85rem; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--border); background: var(--surface); }
  .badge.yes { color: #1f7a4d; border-color: #b7e0c8; background: #eefaf3; }
  .badge.no { color: #b42318; border-color: #f0c4c0; background: #fdf2f1; }
  .elig-callout { border-radius: 8px; padding: 12px 14px; margin: 0 0 12px; border: 1px solid var(--border); background: var(--surface); font-size: 0.9rem; }
  .elig-callout.ok { border-color: #b7e0c8; background: #eefaf3; color: #145c38; }
  .elig-callout.danger { border-color: #f0c4c0; background: #fdf2f1; color: #7a1c14; }
  .lender-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 16px; }
  .lender-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .lender-head h3 { margin: 0; font-size: 1.05rem; }
  .lender-head .code { color: var(--muted); font-weight: 500; }
  .json-detail { display: block; margin: 0; padding: 12px 16px; background: #f4f6f9; font-size: 0.75rem; overflow: auto; max-height: 360px; border: 0; border-bottom: 1px solid var(--border); border-radius: 0; white-space: pre-wrap; word-break: break-word; }
  .json-detail.hidden, .json-detail[hidden] { display: none !important; }
  .json-detail h4 { margin: 8px 0 4px; font-size: 0.8rem; }
  .json-detail pre { margin: 0 0 12px; white-space: pre-wrap; word-break: break-word; }
  .timeline { list-style: none; padding: 0; margin: 0; }
  .timeline li { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; }
  .timeline time { display: block; font-size: 0.72rem; color: var(--muted); }
  .chip { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .chip.pass { background: #e6f4ed; color: #1f7a4d; }
  .chip.fail { background: #fdecea; color: #b42318; }
  .chip.skip { background: #fff8e6; color: #9a6700; }
  .chip.notrun { background: #f0f0ec; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { background: #eef2f7; font-weight: 650; }
  td.num { text-align: right; width: 40px; }
  td.formula { font-family: ui-monospace, monospace; font-size: 0.75rem; }
  .table-wrap { overflow-x: auto; }
  .muted { color: var(--muted); }
  .reason-emphasis { color: #9a3412; font-weight: 600; }
  .back { margin-bottom: 12px; display: inline-block; }
  .field-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .field-card { background: #f7fafc; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
  .field-card.missing { border-style: dashed; opacity: 0.85; }
  .field-card .fk { display: block; font-size: 0.7rem; color: var(--muted); margin-bottom: 4px; }
  .field-card .fv { font-weight: 600; font-size: 0.9rem; word-break: break-word; }
  .step-tag { font-size: 0.72rem; font-weight: 600; color: var(--muted); margin-left: 8px; }
  .funnel-step h2 { font-size: 1.02rem; }
  .doc-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .doc-chip { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; min-width: 180px; background: #fff; }
  .doc-chip.ok { border-color: #b7e0c8; }
  .doc-chip.fail { border-color: #f0c4c0; background: #fffbfb; }
  .doc-chip .path { display: block; font-size: 0.68rem; color: var(--muted); margin-top: 4px; }
  .error-callout { background: #fff5f5; border: 1px solid #f0c4c0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
  .error-callout.warn { background: #fff8e6; border-color: #e6d19a; }
  .subh { font-size: 0.95rem; margin: 18px 0 8px; color: var(--accent-dark); }
  .funnel-step .subh:first-child { margin-top: 0; }
  .btn.ghost { margin-top: 10px; }
  h2 { scroll-margin-top: 56px; }
</style>
</head>
<body>
<div class="report-wrap">
  <a class="back" href="${basePath}/">← Back to suite</a>
  <h1>${escapeHtml(title)}</h1>
  <p class="report-meta">
    Mode: <strong>${escapeHtml(reportMeta.mode || reportMeta.source || '—')}</strong>
    · runId ${escapeHtml(String(reportMeta.runId || runId))}
    · lead <strong>${escapeHtml(String(reportMeta.leadId || '—'))}</strong>
    · loan-app ${escapeHtml(String(reportMeta.loanAppId || '—'))}
  </p>
  ${nav()}

  <section class="card" id="sec-timeline" style="margin-bottom:20px">
    <h2>Timeline — what happened</h2>
    ${buildTimeline(runForReport.events)}
  </section>

  ${buildFormsSection(runForReport)}

  <div id="sec-bureau">${buildBureauSection(runForReport.bureau)}</div>

  <h2 id="sec-eligibility" style="margin:24px 0 12px">4. AI Match — Eligibility (formulas + values)</h2>
  <p class="muted">Pick a lender to inspect. Each row shows threshold, applicant, formula, result, and Pass/Fail/Skip reason.</p>
  ${eligibilityHtml}

  <div id="sec-scoring">${buildScoringSection(runForReport.scoring)}</div>
  <div id="sec-errors">${buildErrorsSection(runForReport.errors)}</div>

  <p class="muted" style="margin-top:24px;font-size:0.78rem">Generated ${escapeHtml(new Date().toISOString())} · ScaleX Automation Testing Suite</p>
</div>
<script type="application/json" id="run-data">${dataJson}</script>
<script>
(function() {
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function chip(result) {
    var r = String(result || '').toUpperCase();
    var cls = ({
      PASS: 'chip pass', FAIL: 'chip fail', SKIP: 'chip skip',
      NOT_RUN: 'chip notrun', NOT_EVALUATED: 'chip notrun',
      SCORED: 'chip pass', OK: 'chip pass', ERROR: 'chip fail', WARN: 'chip skip'
    })[r] || 'chip';
    return '<span class="' + cls + '">' + escapeHtml(r || '—') + '</span>';
  }
  function applicantDisplayValue(applicant) {
    if (
      applicant != null &&
      typeof applicant === 'object' &&
      !Array.isArray(applicant) &&
      applicant.annualTurnoverInr != null &&
      applicant.turnoverLakh != null &&
      applicant.existingTotalEmi == null &&
      applicant.applicantFoir == null
    ) {
      return applicant.annualTurnoverInr;
    }
    return applicant;
  }
  function formatStepCondition(s) {
    if (!s) return '';
    if (s.evaluation) return String(s.evaluation);
    var applicant = applicantDisplayValue(s.applicant != null ? s.applicant : s.applicantValue);
    if (applicant != null || s.threshold != null) {
      return 'applicant=' + JSON.stringify(applicant)
        + ' vs threshold=' + JSON.stringify(s.threshold)
        + ' → ' + (s.result || '');
    }
    return '';
  }
  function formatStepReason(s) {
    if (!s) return '';
    var r = String(s.result || '').toUpperCase();
    if (r === 'FAIL' || r === 'SKIP') {
      return s.reason || s.errorCode || s.reasonDisplay || '—';
    }
    return s.reason || s.errorCode || s.reasonDisplay || '';
  }
  function fmtPlain(v) {
    var display = applicantDisplayValue(v);
    if (display == null || display === '') return '—';
    if (typeof display === 'boolean') return display ? 'Yes' : 'No';
    if (typeof display === 'object') return JSON.stringify(display);
    return String(display);
  }
  function formatRulesMatched(row) {
    if (!row) return '—';
    if (row.rules != null) {
      return fmtPlain(row.rules)
        + (row.matchedKey != null ? ' · matched ' + String(row.matchedKey) : '');
    }
    if (row.matchedKey != null) return 'matched ' + String(row.matchedKey);
    if (row.branchUsed != null || row.matchMode != null) {
      var parts = [];
      if (row.branchUsed != null) parts.push('branch=' + fmtPlain(row.branchUsed));
      if (row.matchMode != null) parts.push('mode=' + fmtPlain(row.matchMode));
      return parts.join(' · ');
    }
    return '—';
  }
  function fmtJson(v) {
    if (v == null || v === '') return '—';
    if (typeof v === 'object') return escapeHtml(JSON.stringify(v));
    return escapeHtml(String(v));
  }
  function loadRun() {
    var el = document.getElementById('run-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  var RUN = loadRun();
  var lenders = ((RUN && RUN.lenders) || []).map(function(l) {
    var steps = l.fullSteps || l.steps || [];
    var stepFail = steps.some(function(s) { return String(s.result || '').toUpperCase() === 'FAIL'; });
    var eligible = !(stepFail || l.failedAt) && l.eligible === true;
    return Object.assign({}, l, { eligible: eligible });
  });
  var scoring = (RUN && RUN.scoring) || [];

  function setJsonPanelVisible(el, btn, show, showLabel, hideLabel) {
    if (!el) return;
    if (show) {
      el.classList.remove('hidden');
      el.removeAttribute('hidden');
      el.style.display = 'block';
    } else {
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
      el.style.display = 'none';
    }
    if (btn) btn.textContent = show ? (hideLabel || 'Hide details') : (showLabel || 'Show details');
  }

  function lenderEligibilityJson(lender) {
    if (lender && lender.eligibility && typeof lender.eligibility === 'object') {
      return lender.eligibility;
    }
    var code = lender && lender.code;
    var rules = lender.fullSteps || lender.steps || [];
    if (rules.length) {
      var passed = rules.filter(function(s) { return String(s.result || '').toUpperCase() === 'PASS'; }).length;
      var failed = rules.filter(function(s) { return String(s.result || '').toUpperCase() === 'FAIL'; }).length;
      return {
        leadId: RUN && RUN.meta ? RUN.meta.leadId : null,
        loanType: RUN && RUN.meta ? (RUN.meta.loanType || RUN.meta.product) : null,
        lenderCode: code,
        lenderName: lender.lenderName || null,
        lenderType: lender.lenderType || null,
        eligible: lender.eligible === true,
        failedAt: lender.failedAt || null,
        errorCode: lender.errorCode || null,
        score: lender.score != null ? lender.score : null,
        rank: lender.rank != null ? lender.rank : null,
        passed: passed,
        failed: failed,
        rules: rules.map(function(s) {
          return {
            step: s.step,
            ruleId: s.ruleId,
            ruleName: s.ruleName,
            formula: s.formula,
            applicantValue: s.applicantValue != null ? s.applicantValue : s.applicant,
            threshold: s.threshold,
            result: s.result,
            reason: s.reason != null ? s.reason : null,
            errorCode: s.errorCode != null ? s.errorCode : null,
            evaluation: s.evaluation != null ? s.evaluation : null,
            branchUsed: s.branchUsed != null ? s.branchUsed : undefined,
            matchMode: s.matchMode != null ? s.matchMode : undefined
          };
        })
      };
    }
    return {
      lenderCode: code,
      lenderName: lender.lenderName,
      lenderType: lender.lenderType,
      eligible: lender.eligible,
      score: lender.score,
      rank: lender.rank,
      failedAt: lender.failedAt || null,
      errorCode: lender.errorCode || null,
      rules: []
    };
  }

  function isEligible(l) {
    return l && l.eligible === true;
  }

  function renderLender() {
    var sel = document.getElementById('lender-select');
    if (!sel || !lenders.length) return;
    var lender = lenders.find(function(l) { return l.code === sel.value; }) || lenders[0];
    if (!lender) return;
    var ok = isEligible(lender);

    var badge = document.getElementById('elig-badge');
    badge.textContent = ok ? 'Eligible (PASS)' : 'Not eligible (FAIL)';
    badge.className = 'badge ' + (ok ? 'yes' : 'no');

    var callout = document.getElementById('elig-callout');
    if (ok) {
      callout.hidden = false;
      callout.className = 'elig-callout ok';
      callout.textContent = (lender.lenderName || lender.code) + ' passed all eligibility steps for this product.';
    } else if (lender.failedAt || lender.errorCode) {
      var failStep = (lender.fullSteps || lender.steps || []).find(function(s) { return String(s.result || '').toUpperCase() === 'FAIL'; });
      var reason = failStep && failStep.reason ? ' — ' + failStep.reason : '';
      callout.hidden = false;
      callout.className = 'elig-callout danger';
      callout.textContent = (lender.lenderName || lender.code) + ' FAILED at '
        + (lender.failedAt || (failStep && failStep.ruleId) || '—')
        + (lender.errorCode ? ' · ' + lender.errorCode : '')
        + reason;
    } else {
      callout.hidden = false;
      callout.className = 'elig-callout danger';
      callout.textContent = (lender.lenderName || lender.code) + ' is not eligible for this product.';
    }

    document.getElementById('elig-title').innerHTML =
      escapeHtml(lender.lenderName || lender.code)
      + ' <span class="code">' + escapeHtml(lender.code || '') + '</span>';

    var metaParts = [];
    metaParts.push(ok ? chip('PASS') + ' Eligible' : chip('FAIL') + ' Not eligible');
    if (lender.failedAt) metaParts.push('stopped at ' + escapeHtml(lender.failedAt));
    if (lender.score != null) metaParts.push('score ' + escapeHtml(String(lender.score)));
    if (lender.rank != null) metaParts.push('rank #' + escapeHtml(String(lender.rank)));
    document.getElementById('elig-meta').innerHTML = metaParts.join(' · ');

    var steps = lender.fullSteps || lender.steps || [];
    var tbody = document.getElementById('elig-tbody');
    tbody.innerHTML = steps.length
      ? steps.map(function(s) {
          var r = String(s.result || '').toUpperCase();
          var reasonCls = (r === 'FAIL' || r === 'SKIP') ? 'reason-emphasis' : 'muted';
          return '<tr>'
            + '<td><code>' + escapeHtml(s.ruleId || '') + '</code></td>'
            + '<td>' + escapeHtml(s.ruleName || '') + '</td>'
            + '<td>' + escapeHtml(fmtPlain(s.threshold)) + '</td>'
            + '<td>' + escapeHtml(fmtPlain(s.applicant != null ? s.applicant : s.applicantValue)) + '</td>'
            + '<td class="muted">' + escapeHtml(formatRulesMatched(s)) + '</td>'
            + '<td class="muted formula">' + escapeHtml(s.formula || '') + '</td>'
            + '<td>' + chip(s.result) + '</td>'
            + '<td class="' + reasonCls + '">' + escapeHtml(formatStepReason(s)) + '</td>'
            + '</tr>';
        }).join('')
      : '<tr><td colspan="8" class="muted">No step data — open Show details or check eligibility log</td></tr>';

    var jsonEl = document.getElementById('elig-json');
    var detailBtn = document.getElementById('elig-detail-btn');
    if (jsonEl) {
      try {
        jsonEl.textContent = JSON.stringify(lenderEligibilityJson(lender), null, 2);
      } catch (err) {
        jsonEl.textContent = String(err && err.message ? err.message : err);
      }
      setJsonPanelVisible(jsonEl, detailBtn, false);
    }
  }

  function fillLenderSelect(preferredCode) {
    var sel = document.getElementById('lender-select');
    var filter = document.getElementById('lender-filter');
    if (!sel) return;
    var mode = filter ? filter.value : 'all';
    var pass = lenders.filter(isEligible);
    var fail = lenders.filter(function(l) { return !isEligible(l); });
    var list = mode === 'pass' ? pass : mode === 'fail' ? fail : lenders.slice().sort(function(a, b) {
      return Number(isEligible(b)) - Number(isEligible(a)) || String(a.code).localeCompare(String(b.code));
    });

    function opt(l) {
      var ok = isEligible(l);
      var label = (l.code || '?') + ' — ' + (l.lenderName || '')
        + (ok ? ' · PASS' : (' · FAIL' + (l.failedAt ? ' @ ' + l.failedAt : '')));
      var selected = preferredCode && l.code === preferredCode ? ' selected' : '';
      return '<option value="' + escapeHtml(l.code) + '"' + selected + '>'
        + escapeHtml(label) + '</option>';
    }

    if (mode === 'all') {
      sel.innerHTML =
        '<optgroup label="Eligible (PASS) — ' + pass.length + '">'
        + pass.map(opt).join('')
        + '</optgroup>'
        + '<optgroup label="Not eligible (FAIL) — ' + fail.length + '">'
        + fail.map(opt).join('')
        + '</optgroup>';
    } else {
      sel.innerHTML = list.map(opt).join('')
        || '<option value="">No lenders in this filter</option>';
    }

    if (preferredCode && [].some.call(sel.options, function(o) { return o.value === preferredCode; })) {
      sel.value = preferredCode;
    } else if (sel.options.length && sel.options[0].value) {
      sel.selectedIndex = 0;
    }
  }

  function initEligibility() {
    var sel = document.getElementById('lender-select');
    var filter = document.getElementById('lender-filter');
    if (!sel || !lenders.length) return;
    var preferred = lenders.find(isEligible) || lenders[0];
    fillLenderSelect(preferred && preferred.code);
    sel.addEventListener('change', renderLender);
    if (filter) {
      filter.addEventListener('change', function() {
        var current = sel.value;
        fillLenderSelect(current);
        renderLender();
      });
    }
    document.getElementById('elig-detail-btn').addEventListener('click', function() {
      var el = document.getElementById('elig-json');
      if (!el) return;
      var currentlyHidden = el.classList.contains('hidden') || el.hasAttribute('hidden') || el.style.display === 'none';
      setJsonPanelVisible(el, this, currentlyHidden);
    });
    renderLender();
  }

  function renderScoreLender() {
    var sel = document.getElementById('score-lender-select');
    if (!sel || !scoring.length) return;
    var row = scoring.find(function(s) { return String(s.code) === sel.value; }) || scoring[0];
    if (!row) return;

    var hasScore = row.totalScore != null && row.totalScore !== '';
    var shown = row.displayed && hasScore && Number(row.totalScore) >= 40;
    var badge = document.getElementById('score-badge');
    if (badge) {
      badge.textContent = shown ? 'Shown (≥40)' : (hasScore ? 'Below 40' : 'No score');
      badge.className = 'badge ' + (shown ? 'yes' : 'no');
    }

    var titleEl = document.getElementById('score-title');
    if (titleEl) {
      titleEl.innerHTML =
        escapeHtml(row.lenderName || row.code)
        + ' <span class="code">' + escapeHtml(row.code || '') + '</span>';
    }
    var metaEl = document.getElementById('score-meta');
    if (metaEl) {
      metaEl.innerHTML =
        'Total score <strong>' + escapeHtml(hasScore ? String(row.totalScore) : '—') + '</strong>'
        + (row.rank != null ? ' · rank #' + escapeHtml(String(row.rank)) : '')
        + ' · ' + (shown ? chip('PASS') + ' Shown on AI Match' : chip('SKIP') + (hasScore ? ' Below 40' : ' No score'));
    }

    var crit = row.criteria;
    var tbody = document.getElementById('score-tbody');
    if (!tbody) return;
    var rows = [];
    if (Array.isArray(crit) && crit.length) {
      rows = crit.map(function(c) {
        var r = String(c.result || 'SCORED').toUpperCase();
        var reasonCls = (r === 'FAIL' || r === 'SKIP') ? 'reason-emphasis' : 'muted';
        return '<tr>'
          + '<td><code>' + escapeHtml(c.criterionId || c.id || '') + '</code></td>'
          + '<td>' + escapeHtml(c.weight != null ? c.weight : '—') + '</td>'
          + '<td>' + escapeHtml(fmtPlain(c.threshold)) + '</td>'
          + '<td>' + escapeHtml(fmtPlain(c.applicant != null ? c.applicant : c.applicantValue)) + '</td>'
          + '<td class="muted">' + escapeHtml(formatRulesMatched(c)) + '</td>'
          + '<td class="muted formula">' + escapeHtml(c.formula || '') + '</td>'
          + '<td>' + escapeHtml(c.points != null ? c.points : '—') + '</td>'
          + '<td>' + chip(c.result || 'SCORED') + '</td>'
          + '<td class="' + reasonCls + '">' + escapeHtml(c.reason || c.errorCode || '') + '</td>'
          + '</tr>';
      });
    } else if (crit && typeof crit === 'object' && !Array.isArray(crit)) {
      rows = Object.entries(crit).map(function(entry) {
        var k = entry[0], v = entry[1];
        return '<tr>'
          + '<td><code>' + escapeHtml(k) + '</code></td>'
          + '<td>—</td><td>—</td><td>—</td><td>—</td>'
          + '<td class="muted">criterion points</td>'
          + '<td>' + fmtJson(v) + '</td>'
          + '<td>' + chip('SCORED') + '</td>'
          + '<td></td></tr>';
      });
    }
    tbody.innerHTML = rows.length
      ? rows.join('')
      : '<tr><td colspan="9" class="muted">No criterion breakdown for this lender — use Show details for JSON</td></tr>';

    var jsonEl = document.getElementById('score-json');
    var detailBtn = document.getElementById('score-detail-btn');
    if (jsonEl) {
      try {
        var scoreDetail = Object.assign({}, row);
        // keep criteria (table already shows them); still useful in JSON
        jsonEl.textContent = JSON.stringify(scoreDetail, null, 2);
      } catch (err) {
        jsonEl.textContent = String(err && err.message ? err.message : err);
      }
      setJsonPanelVisible(jsonEl, detailBtn, false);
    }
  }

  function initScoring() {
    var sel = document.getElementById('score-lender-select');
    var detailBtn = document.getElementById('score-detail-btn');
    if (detailBtn && !detailBtn._bound) {
      detailBtn._bound = true;
      detailBtn.addEventListener('click', function() {
        var el = document.getElementById('score-json');
        if (!el) return;
        var currentlyHidden = el.classList.contains('hidden') || el.hasAttribute('hidden') || el.style.display === 'none';
        setJsonPanelVisible(el, this, currentlyHidden);
      });
    }
    if (!sel || !scoring.length) return;
    if (!sel.options.length) {
      var preferred = scoring.find(function(s) {
        return s.displayed && s.criteria && s.criteria.length;
      }) || scoring.find(function(s) { return s.displayed; }) || scoring[0];
      sel.innerHTML = scoring.map(function(s) {
        var label = (s.code || '?') + ' — ' + (s.lenderName || '')
          + ' (' + (s.totalScore != null ? s.totalScore : '?') + ')'
          + (s.displayed ? ' · shown' : ' · below 40');
        var selected = preferred && s.code === preferred.code ? ' selected' : '';
        return '<option value="' + escapeHtml(String(s.code)) + '"' + selected + '>'
          + escapeHtml(label) + '</option>';
      }).join('');
    }
    sel.addEventListener('change', renderScoreLender);
    renderScoreLender();
  }

  document.querySelectorAll('.toggle-detail').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var el = document.getElementById(btn.dataset.target);
      if (!el) return;
      var hidden = el.classList.toggle('hidden');
      if (btn.textContent.indexOf('Show') === 0 || btn.textContent.indexOf('Hide') === 0) {
        btn.textContent = hidden
          ? (btn.dataset.target === 'bureau-json' ? 'Show extracted JSON' : 'Show details')
          : (btn.dataset.target === 'bureau-json' ? 'Hide extracted JSON' : 'Hide details');
      }
    });
  });

  initEligibility();
  initScoring();
})();
</script>
</body>
</html>`;

  const fileName = opts.fileName || 'report.html';
  const absolutePath = path.join(runDir, fileName);
  fs.writeFileSync(absolutePath, html);

  const folder = productId || path.basename(runDir);
  const relativePath = `reports/runs/${folder}/${fileName}`;
  return { absolutePath, relativePath, fileName };
}

/** Fix false bureau FAIL / empty scoring criteria when regenerating older run.json files. */
function hydrateRunForReport(run) {
  const evaluateByCode = new Map();
  for (const c of run.httpCapture || []) {
    const label = String(c.label || '');
    const body = c.response;
    if (!body || typeof body !== 'object') continue;
    if (!Array.isArray(body.rules)) continue;
    const code = body.lenderCode || (label.match(/evaluate\s+(.+)$/i) || [])[1];
    if (code) evaluateByCode.set(String(code), body);
  }

  const next = {
    ...run,
    errors: [...(run.errors || [])],
    scoring: [...(run.scoring || [])],
    lenders: (run.lenders || []).map((l) => {
      const steps = l.fullSteps || l.steps || [];
      const stepFail = steps.some((s) => String(s.result || '').toUpperCase() === 'FAIL');
      const eligible = !(stepFail || l.failedAt) && l.eligible === true;
      const failedAt =
        l.failedAt ||
        (stepFail ? steps.find((s) => String(s.result || '').toUpperCase() === 'FAIL')?.ruleId : null);
      const eligibility =
        l.eligibility ||
        evaluateByCode.get(String(l.code)) ||
        null;
      return {
        ...l,
        eligible,
        failedAt: failedAt || l.failedAt || null,
        eligibility: eligibility || undefined,
      };
    }),
  };
  next.lenders.sort(
    (a, b) => Number(b.eligible) - Number(a.eligible) || String(a.code).localeCompare(String(b.code))
  );
  const bureau = run.bureau;
  if (bureau && !bureau.ok) {
    const nested =
      bureau.extracted?.cibil_score != null ||
      bureau.extracted?._extractionMeta ||
      (bureau.extracted && typeof bureau.extracted === 'object' && Object.keys(bureau.extracted).length > 3) ||
      bureau.raw?.data?.database?.cibilData ||
      bureau.raw?.data?.extraction;
    if (nested) {
      const cibil =
        bureau.raw?.data?.database?.cibilData ||
        (bureau.raw?.data?.extraction &&
        (bureau.raw.data.extraction.cibil_score != null || bureau.raw.data.extraction._extractionMeta)
          ? bureau.raw.data.extraction
          : null) ||
        bureau.extracted;
      const score = cibil?.cibil_score ?? cibil?.cibilScore ?? bureau.cibilScore;
      if (score != null || (cibil && typeof cibil === 'object' && Object.keys(cibil).length > 3)) {
        next.bureau = {
          ...bureau,
          ok: true,
          cibilScore: score ?? bureau.cibilScore,
          extracted:
            cibil && typeof cibil === 'object' && !cibil.database ? cibil : bureau.extracted || cibil,
        };
        next.errors = next.errors.filter(
          (e) => !(e.stage === 'bureau_extract' && /no usable cibilData/i.test(e.message || ''))
        );
      }
    }
  }

  // Always refresh scoring from disk log when possible (fixes truncated parser + merge ranks)
  if (run.meta?.leadId) {
    const product = run.meta.product || '';
    const scoreDir =
      product === 'business-loan' || run.meta.loanType === 'Business Loan'
        ? 'logs/business-loan/bl-scoring'
        : 'logs/personal-loan/pl-scoring';
    const dir = path.join(REPO_ROOT, scoreDir);
    let logRows = next.scoring || [];
    if (fs.existsSync(dir)) {
      const prefix = `${run.meta.leadId}-`;
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(prefix) && f.endsWith('.log'))
        .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files.length) {
        try {
          const sp = parseScoringLog(fs.readFileSync(path.join(dir, files[0].f), 'utf8'));
          if (sp.scoring?.length) logRows = sp.scoring;
        } catch {
          /* keep existing */
        }
      }
    }
    next.scoring = mergeScoringRows(logRows, run.matchBody);
  }

  return next;
}
