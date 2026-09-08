/**
 * Live Run pipeline — creates lead + loan-app, uploads docs, bureau extract, AI Match.
 * Emits SSE events and writes a detailed HTML report. Writes to Strapi when confirmed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { publish } from '../event-bus.js';
import { REPORTS_DIR, REPO_ROOT } from '../paths.js';
import {
  createLead,
  createLoanApplication,
  uploadFile,
  extractBureau,
  getBureauSummary,
  getMatchedLenders,
  getLoanType,
  scoreLender,
  capturedRequest,
  getStrapiUrl,
} from '../http-client.js';
import {
  getProduct,
  buildUniqueCustomer,
  buildLeadPayload,
  buildLoanAppPayload,
  resolveDocumentUploads,
} from '../live-payloads.js';
import { generateRunReport } from '../report/generate-run-report.js';
import { parseEligibilityLog, parseScoringLog, mergeScoringRows } from '../utils/log-parse.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function scoringHasDetails(rows) {
  return (rows || []).some(
    (s) =>
      (s.totalScore != null && s.totalScore !== '') ||
      (Array.isArray(s.criteria) && s.criteria.length > 0)
  );
}

function readScoringLogRows(product, leadId, leadNameStem) {
  const scoreLog = findLatestLog(product.logDirs.scoring, leadId, leadNameStem);
  if (!scoreLog) return { rows: [], path: null };
  try {
    const sp = parseScoringLog(fs.readFileSync(scoreLog, 'utf8'));
    const rows = sp.scoring?.length ? sp.scoring : sp.lenders || [];
    return { rows, path: scoreLog };
  } catch {
    return { rows: [], path: scoreLog };
  }
}

/** When matched-lenders returns null scores, score each displayed lender via score API. */
async function enrichScoringFromScoreApi(leadId, matchBody, scoreApi, httpCapture, errors, events) {
  if (!scoreApi) return [];
  const targets = [...(matchBody?.lenders || []), ...(matchBody?.belowThreshold || [])];
  const rows = [];
  for (let i = 0; i < targets.length; i++) {
    const l = targets[i];
    const code = l.lenderCode;
    if (!code) continue;
    try {
      const one = await scoreLender(leadId, code, scoreApi, httpCapture);
      const criteria = (one.criteria || []).map((c) => ({
        criterionId: c.criterionId,
        phase: c.phase,
        result: c.result,
        ruleType: c.ruleType,
        formula: c.formula,
        rules: c.rules,
        matchedKey: c.matchedKey,
        applicant: c.applicantValue ?? c.applicant,
        threshold: c.threshold,
        weight: c.weight,
        points: c.points,
        errorCode: c.errorCode,
      }));
      const totalScore = one.totalScore ?? null;
      rows.push({
        rank: l.rank ?? i + 1,
        code,
        lenderName: l.lenderName || '',
        totalScore,
        displayed:
          Boolean(matchBody?.lenders?.some((x) => x.lenderCode === code)) &&
          totalScore != null &&
          totalScore >= 40,
        criteria,
      });
    } catch (err) {
      errors.push({
        stage: 'score_api',
        message: err.message,
        lenderCode: code,
        severity: 'warning',
      });
    }
  }
  if (rows.length) {
    emit(events, 'scoring_api', `Scored ${rows.length} lenders via score API fallback`);
  }
  return rows;
}

/** Normalize extract / summary payloads to cibilData (handles nested Strapi extract body). */
function unwrapCibilData(row) {
  if (!row || typeof row !== 'object') return null;
  if (row.cibilData && typeof row.cibilData === 'object') return row.cibilData;
  if (row.cibil_data && typeof row.cibil_data === 'object') return row.cibil_data;
  if (row.attributes?.cibilData && typeof row.attributes.cibilData === 'object') {
    return row.attributes.cibilData;
  }
  if (row.attributes?.cibil_data && typeof row.attributes.cibil_data === 'object') {
    return row.attributes.cibil_data;
  }
  if (row.data?.database?.cibilData && typeof row.data.database.cibilData === 'object') {
    return row.data.database.cibilData;
  }
  if (row.database?.cibilData && typeof row.database.cibilData === 'object') {
    return row.database.cibilData;
  }
  const extraction = row.data?.extraction;
  if (extraction && typeof extraction === 'object') {
    if (extraction.cibilData && typeof extraction.cibilData === 'object') return extraction.cibilData;
    if (
      extraction.cibil_score != null ||
      extraction._extractionMeta ||
      Object.keys(extraction).length > 3
    ) {
      return extraction;
    }
  }
  if (row.cibil_score != null || row._extractionMeta) return row;
  return null;
}

function isUsableCibilData(cibilData) {
  if (!cibilData || typeof cibilData !== 'object') return false;
  const score = cibilData.cibil_score ?? cibilData.cibilScore;
  return (
    score != null ||
    Boolean(cibilData._extractionMeta) ||
    Object.keys(cibilData).length > 3
  );
}

function emit(events, stage, message, extra = {}) {
  const payload = { stage, message, ts: new Date().toISOString(), ...extra };
  events.push(payload);
  publish(payload);
  return payload;
}

function stemName(fullName) {
  return String(fullName || 'Suite')
    .replace(/\[SUITE-TEST\]\s*/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 40) || 'Suite';
}

function findLatestLog(logDirRel, leadId, nameStem) {
  const dir = path.join(REPO_ROOT, logDirRel);
  if (!fs.existsSync(dir)) return null;
  const prefix = `${leadId}-`;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.log'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) {
    const loose = fs
      .readdirSync(dir)
      .filter((f) => f.includes(String(leadId)) && f.endsWith('.log'))
      .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!loose.length) return null;
    return path.join(dir, loose[0].f);
  }
  // Prefer name match — files often keep SUITE-TEST prefix; stem strips the tag
  const stem = String(nameStem || '').toLowerCase();
  const needle = stem.slice(0, Math.min(12, stem.length)) || stem.slice(0, 8);
  const byName =
    (needle && files.find((x) => x.f.toLowerCase().includes(needle))) ||
    files.find((x) => /suite-?test/i.test(x.f) && stem && x.f.toLowerCase().includes(stem.slice(0, 6)));
  return path.join(dir, (byName || files[0]).f);
}

async function evaluateLender(leadId, lenderCode, evaluateApi, capture) {
  const base = getStrapiUrl();
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}${evaluateApi}`,
    data: { leadId: Number(leadId), lenderCode },
    headers: { 'Content-Type': 'application/json' },
    label: `POST evaluate ${lenderCode}`,
  });
  if (res.status >= 400) return null;
  return res.data;
}

function mergeLenderDetails(matchBody, evaluations, logParsed) {
  const byCode = new Map();
  const matchPass = new Set((matchBody?.lenders || []).map((e) => e.lenderCode).filter(Boolean));
  const matchFail = new Set((matchBody?.excluded || []).map((e) => e.lenderCode).filter(Boolean));

  function formatStepCondition(s) {
    if (!s) return '';
    if (s.evaluation) return String(s.evaluation);
    const applicant = s.applicant != null ? s.applicant : s.applicantValue;
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

  function enrichSteps(steps) {
    return (steps || []).map((s) => {
      const evaluation = formatStepCondition(s) || s.evaluation || null;
      return {
        ...s,
        applicant: s.applicant != null ? s.applicant : s.applicantValue,
        threshold: s.threshold,
        evaluation,
      };
    });
  }

  for (const e of matchBody?.lenders || []) {
    byCode.set(e.lenderCode, {
      code: e.lenderCode,
      lenderName: e.lenderName,
      lenderType: e.lenderType,
      eligible: true,
      score: e.score,
      rank: e.rank,
      steps: [],
      fullSteps: [],
    });
  }
  for (const e of matchBody?.excluded || []) {
    byCode.set(e.lenderCode, {
      code: e.lenderCode,
      lenderName: e.lenderName,
      eligible: false,
      failedAt: e.failedAt,
      errorCode: e.errorCode,
      steps: [],
      fullSteps: [],
    });
  }
  for (const ev of evaluations) {
    if (!ev?.lenderCode) continue;
    const row = byCode.get(ev.lenderCode) || {
      code: ev.lenderCode,
      eligible: false,
      steps: [],
      fullSteps: [],
    };
    const rules = enrichSteps(
      (ev.rules || []).map((c) => ({
        step: c.step,
        ruleId: c.ruleId,
        ruleName: c.ruleName,
        result: c.result,
        formula: c.formula,
        applicant: c.applicantValue != null ? c.applicantValue : c.applicant,
        applicantValue: c.applicantValue,
        threshold: c.threshold,
        reason: c.reason,
        errorCode: c.errorCode,
      }))
    );
    row.fullSteps = rules;
    row.steps = rules;
    row.eligibility = ev;
    row.lenderName = row.lenderName || ev.lenderName;
    if (ev.failedAt) row.failedAt = ev.failedAt;
    if (ev.errorCode) row.errorCode = ev.errorCode;
    byCode.set(ev.lenderCode, row);
  }
  if (logParsed?.lenders?.length) {
    for (const L of logParsed.lenders) {
      const code = L.code || L.lenderCode;
      const row = byCode.get(code) || {
        code,
        lenderName: L.lenderName,
        eligible: false,
        steps: [],
        fullSteps: [],
      };
      if ((L.fullSteps || L.steps)?.length) {
        row.fullSteps = enrichSteps(L.fullSteps || L.steps);
        row.steps = row.fullSteps;
      }
      if (L.lenderName) row.lenderName = L.lenderName;
      if (L.failedAt) row.failedAt = L.failedAt;
      if (L.errorCode) row.errorCode = L.errorCode;
      byCode.set(code, row);
    }
  }

  // Final eligibility: match lists + step FAIL win over evaluate quirks
  for (const row of byCode.values()) {
    const steps = row.fullSteps || row.steps || [];
    const stepFail = steps.some((s) => String(s.result || '').toUpperCase() === 'FAIL');
    if (matchFail.has(row.code) || stepFail || row.failedAt) {
      row.eligible = false;
      if (stepFail && !row.failedAt) {
        const failStep = steps.find((s) => String(s.result || '').toUpperCase() === 'FAIL');
        if (failStep?.ruleId) row.failedAt = failStep.ruleId;
      }
    } else if (matchPass.has(row.code)) {
      row.eligible = true;
    } else if (row.eligible == null) {
      row.eligible = false;
    }
  }

  const list = [...byCode.values()];
  list.sort((a, b) => Number(b.eligible) - Number(a.eligible) || String(a.code).localeCompare(String(b.code)));
  return list;
}

/**
 * @param {{ product: string, confirm: boolean, runId?: string }} opts
 */
export async function runLivePipeline(opts) {
  const { product: productId } = opts;
  if (!opts.confirm) {
    throw new Error('Live Run requires confirm: true — this writes to Strapi');
  }
  if (!['personal-loan', 'business-loan'].includes(productId)) {
    throw new Error('product must be personal-loan or business-loan');
  }

  const product = getProduct(productId);
  const runId = opts.runId || randomUUID();
  const runDir = path.join(REPORTS_DIR, 'runs', runId);
  fs.mkdirSync(runDir, { recursive: true });

  const events = [];
  const httpCapture = [];
  const errors = [];
  const documents = [];
  let customer = null;
  let leadId = null;
  let loanAppId = null;
  let bureau = null;
  let matchBody = null;
  let lenders = [];
  let scoring = [];
  let fieldValues = { lead: {}, loanApp: {} };

  const pollMs = Number(process.env.BUREAU_POLL_MS || 3000);
  const timeoutMs = Number(process.env.BUREAU_TIMEOUT_MS || 300000);

  try {
    emit(events, 'run_start', `Live Run started for ${product.label}`, {
      runId,
      product: productId,
    });

    customer = buildUniqueCustomer(productId);
    fieldValues.lead = buildLeadPayload(customer, product);
    emit(events, 'form_submit_start', `Creating lead ${customer.fullName}`);

    const leadRes = await createLead(fieldValues.lead, httpCapture);
    leadId = leadRes.id;
    emit(events, 'form_submit_finish', `Lead created id=${leadId}`, { leadId });

    // Upload documents first so media IDs can attach on loan-app create
    emit(events, 'doc_upload_start', 'Uploading required documents from product folder');
    const uploads = resolveDocumentUploads(product);
    const mediaFields = {};
    for (const u of uploads) {
      if (!u.exists) {
        const err = `Missing document file: ${u.filePath}`;
        errors.push({ stage: 'doc_upload', message: err });
        emit(events, 'doc_upload_error', err, { field: u.field, file: u.file });
        throw new Error(err);
      }
      try {
        const up = await uploadFile(u.filePath, httpCapture);
        documents.push({
          field: u.field,
          file: u.file,
          localPath: path.relative(REPO_ROOT, u.filePath),
          mediaId: up.id,
          uploadedName: up.name,
          ok: true,
        });
        if (u.multi) {
          if (!Array.isArray(mediaFields[u.field])) mediaFields[u.field] = [];
          mediaFields[u.field].push(up.id);
        } else {
          mediaFields[u.field] = up.id;
        }
        emit(events, 'doc_upload', `Uploaded ${u.file} → ${u.field} (id=${up.id})`, {
          field: u.field,
          mediaId: up.id,
        });
      } catch (err) {
        documents.push({
          field: u.field,
          file: u.file,
          localPath: path.relative(REPO_ROOT, u.filePath),
          ok: false,
          error: err.message,
        });
        errors.push({ stage: 'doc_upload', message: err.message, field: u.field });
        emit(events, 'doc_upload_error', err.message, { field: u.field });
        throw err;
      }
    }
    emit(events, 'doc_upload_finish', `Uploaded ${documents.length} document(s)`);

    emit(events, 'loan_app_start', 'Creating loan application with form_data + media');
    fieldValues.loanApp = buildLoanAppPayload(customer, product, leadId, mediaFields);
    const appRes = await createLoanApplication(fieldValues.loanApp, httpCapture);
    loanAppId = appRes.id;
    emit(events, 'loan_app_finish', `Loan application created id=${loanAppId}`, { loanAppId });

    // Docs attach on create → LOAN_APP_SUBMIT_SUCCESS only (same as public form).
    // Do not call sync-documents — that path writes ADMIN_UPDATE for Lead View admin edits.
    // Bureau extraction — leadName must match loan-app applicantName / disk folder
    // (buildLeadUploadFolderName keeps letters from "[SUITE-TEST] …").
    emit(events, 'bureau_extract_start', 'Starting bureau / CIBIL extraction');
    const extractLeadName = customer.fullName;
    const leadNameStem = stemName(customer.fullName);
    let extractResult = null;
    try {
      // Give mirror time to sync Media Library → disk
      await sleep(3500);
      extractResult = await extractBureau(
        {
          leadId,
          leadName: extractLeadName,
          loanApplicationId: loanAppId,
        },
        httpCapture
      );
      const extractErr =
        extractResult?.error ||
        extractResult?.message ||
        extractResult?.data?.error;
      if (extractErr && /does not exist|failed|error/i.test(String(extractErr))) {
        emit(events, 'bureau_extract', `Extract reported: ${extractErr}`, { warning: true });
        errors.push({ stage: 'bureau_extract', message: String(extractErr), severity: 'warning' });
      } else {
        emit(events, 'bureau_extract', 'Extract API accepted — polling for summary');
      }
    } catch (err) {
      emit(events, 'bureau_extract', `Extract POST note: ${err.message} — will poll`, {
        warning: true,
      });
      errors.push({ stage: 'bureau_extract', message: err.message, severity: 'warning' });
    }

    const deadline = Date.now() + timeoutMs;
    let attempts = 0;
    let summaryRow = null;
    while (Date.now() < deadline) {
      attempts += 1;
      const polled = await getBureauSummary(leadId, httpCapture);
      if (polled.forbidden) {
        if (extractResult?.data || extractResult?.cibilData || extractResult?.summary) {
          summaryRow = extractResult;
          break;
        }
        // Auto-queue may write summary even when GET find is forbidden — check disk log / extract body
        if (extractResult?.ok || extractResult?.cibil_score != null) {
          summaryRow = extractResult;
          break;
        }
        emit(
          events,
          'bureau_extract',
          `Poll attempt ${attempts}: summary GET not permitted — waiting`
        );
      } else if (polled.data) {
        const attrs = polled.data.attributes || polled.data;
        const cibil = attrs.cibilData || attrs.cibil_data;
        if (
          cibil &&
          (cibil.cibil_score != null ||
            cibil._extractionMeta ||
            Object.keys(cibil).length > 2)
        ) {
          summaryRow = { ...attrs, id: polled.data.id, cibilData: cibil };
          break;
        }
      }
      emit(events, 'bureau_extract', `Waiting for extraction… attempt ${attempts}`);
      await sleep(pollMs);
    }

    if (!summaryRow && extractResult) {
      summaryRow = extractResult;
    }

    if (!summaryRow) {
      const msg = `Bureau extraction timed out after ${timeoutMs}ms (${attempts} polls). Check disk folder matches applicantName (expected [SUITE-TEST] in folder name).`;
      errors.push({ stage: 'bureau_extract', message: msg });
      emit(events, 'bureau_extract_error', msg);
      bureau = { ok: false, attempts, cibilScore: null, extracted: null, error: msg };
      // Continue to AI Match — may still work if auto-queue finished under the correct folder
    } else {
      const cibilData = unwrapCibilData(summaryRow);
      const score = cibilData?.cibil_score ?? cibilData?.cibilScore ?? null;
      if (!isUsableCibilData(cibilData)) {
        const msg = 'Bureau response present but no usable cibilData';
        errors.push({ stage: 'bureau_extract', message: msg });
        emit(events, 'bureau_extract_error', msg);
        bureau = { ok: false, attempts, cibilScore: null, extracted: cibilData, raw: summaryRow };
      } else {
        bureau = {
          ok: true,
          attempts,
          cibilScore: score,
          extracted: cibilData,
          raw: summaryRow,
        };
        emit(
          events,
          'bureau_extract_finish',
          `Bureau extraction finished — CIBIL ${bureau.cibilScore ?? 'n/a'} (${attempts} polls)`,
          { cibilScore: bureau.cibilScore }
        );
      }
    }

    // AI Match (even if bureau weak — surface match errors in report)
    emit(events, 'eligibility_start', 'Starting AI Match eligibility');
    try {
      await getLoanType(leadId, httpCapture);
    } catch {
      /* non-fatal */
    }

    try {
      matchBody = await getMatchedLenders(leadId, product.eligibilityApi, httpCapture, {
        source: 'ai-match',
      });
      emit(
        events,
        'eligibility_finish',
        `Eligibility done — ${matchBody?.lenders?.length || 0} displayed, ${matchBody?.excluded?.length || 0} excluded`
      );
    } catch (err) {
      errors.push({ stage: 'eligibility', message: err.message });
      emit(events, 'eligibility_error', err.message, { error: true });
      matchBody = { lenders: [], excluded: [], error: err.message };
    }

    emit(events, 'scoring_start', 'Collecting scoring / rank details');

    // Snapshot scoring from first match + disk log BEFORE evaluate (evaluate can wipe logs)
    let earlyLog = readScoringLogRows(product, leadId, leadNameStem);
    let scoringSnapshot = mergeScoringRows(earlyLog.rows, matchBody);
    if (earlyLog.path && earlyLog.rows.length) {
      emit(
        events,
        'scoring_log',
        `Early scoring log ${path.relative(REPO_ROOT, earlyLog.path)} (${earlyLog.rows.length} lenders)`
      );
    }

    const codes = [
      ...(matchBody?.lenders || []).map((l) => l.lenderCode),
      ...(matchBody?.excluded || []).slice(0, 5).map((l) => l.lenderCode),
    ].filter(Boolean);
    const uniqueCodes = [...new Set(codes)].slice(0, 12);
    const evaluations = [];
    for (const code of uniqueCodes) {
      try {
        const one = await evaluateLender(leadId, code, product.evaluateApi, httpCapture);
        if (one) evaluations.push(one);
      } catch (err) {
        errors.push({ stage: 'evaluate', message: err.message, lenderCode: code });
      }
    }

    // Restore on-disk eligibility/scoring logs to normal AI Match shape
    // (evaluate resets the file with source: evaluate).
    try {
      matchBody = await getMatchedLenders(leadId, product.eligibilityApi, httpCapture, {
        source: 'ai-match',
      });
      emit(events, 'eligibility_restore', 'Re-ran matched-lenders so disk logs use source=ai-match');
    } catch (err) {
      errors.push({
        stage: 'eligibility_restore',
        message: err.message,
        severity: 'warning',
      });
      emit(events, 'eligibility_restore_error', err.message, { warning: true });
    }

    let logParsed = null;
    const eligLog = findLatestLog(product.logDirs.eligibility, leadId, leadNameStem);
    if (eligLog) {
      try {
        logParsed = parseEligibilityLog(fs.readFileSync(eligLog, 'utf8'));
        emit(events, 'eligibility_log', `Parsed eligibility log ${path.relative(REPO_ROOT, eligLog)}`);
      } catch (err) {
        errors.push({ stage: 'eligibility_log', message: err.message });
      }
    }

    const lateLog = readScoringLogRows(product, leadId, leadNameStem);
    let logScoreRows = lateLog.rows.length ? lateLog.rows : earlyLog.rows;
    if (lateLog.path && lateLog.rows.length) {
      emit(
        events,
        'scoring_log',
        `Parsed scoring log ${path.relative(REPO_ROOT, lateLog.path)} (${lateLog.rows.length} lenders)`
      );
    }

    scoring = mergeScoringRows(logScoreRows, matchBody);
    if (!scoringHasDetails(scoring) && scoringHasDetails(scoringSnapshot)) {
      scoring = scoringSnapshot;
      emit(events, 'scoring_fallback', 'Using pre-evaluate scoring snapshot (rematch had no scores)');
    }

    // Last resort: score each displayed lender via score API
    if (!scoringHasDetails(scoring) && product.scoreApi) {
      const apiRows = await enrichScoringFromScoreApi(
        leadId,
        matchBody,
        product.scoreApi,
        httpCapture,
        errors,
        events
      );
      if (apiRows.length) {
        scoring = mergeScoringRows(apiRows, matchBody);
      }
    }

    if (!scoringHasDetails(scoring)) {
      errors.push({
        stage: 'scoring',
        message:
          'Scoring returned no totals/criteria (matched-lenders score was null and score API fallback failed). Criterion table will be empty.',
        severity: 'warning',
      });
      emit(events, 'scoring_missing', 'No scoring totals or criteria available for report');
    }

    lenders = mergeLenderDetails(matchBody, evaluations, logParsed);
    emit(
      events,
      'scoring_finish',
      `Scoring/rank ready — ${scoring.filter((s) => s.displayed).length} on AI Match (≥40)`
    );
    emit(events, 'rank_finish', 'Ranking complete');
  } catch (err) {
    errors.push({ stage: 'pipeline', message: err.message });
    emit(events, 'error', err.message, { error: true });
  }

  const run = {
    meta: {
      runId,
      source: 'live-run',
      product: productId,
      loanType: product.loanType,
      leadId,
      loanAppId,
      leadName: customer?.fullName,
      mode: 'live',
    },
    fieldValues,
    documents,
    bureau,
    httpCapture,
    lenders,
    scoring,
    matchBody,
    events,
    errors,
  };

  fs.writeFileSync(path.join(runDir, 'events.json'), JSON.stringify(events, null, 2));
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2));

  const report = generateRunReport(run, { runDir });
  emit(events, 'report_ready', `Report ready`, {
    runId,
    leadId,
    ok: errors.filter((e) => e.severity !== 'warning').length === 0 && leadId != null,
    reportUrl: `/suite/${report.relativePath}`,
  });
  // refresh events file with report_ready
  fs.writeFileSync(path.join(runDir, 'events.json'), JSON.stringify(events, null, 2));

  const ok = errors.filter((e) => e.severity !== 'warning').length === 0 && leadId != null;
  return {
    ok,
    runId,
    leadId,
    loanAppId,
    report,
    errors,
    events,
  };
}
