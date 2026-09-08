/**
 * Offline Journey Demo — load lead pipeline logs from disk (no Strapi).
 */

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../paths.js';
import { getProduct } from '../live-payloads.js';
import { parseEligibilityLog } from '../utils/log-parse.js';

const STAGE_KEYS = {
  all: ['leadSubmission', 'bureau', 'eligibility', 'scoring'],
  'lead-submission': ['leadSubmission'],
  bureau: ['bureau'],
  eligibility: ['eligibility'],
  scoring: ['scoring'],
};

function absLogDir(rel) {
  return path.join(REPO_ROOT, rel);
}

function listLeadLogFiles(dirRel) {
  const dir = absLogDir(dirRel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.log'))
    .map((f) => {
      const m = f.match(/^(\d+)-/);
      return m
        ? { file: f, leadId: Number(m[1]), full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }
        : null;
    })
    .filter(Boolean);
}

function findLatestFileForLead(dirRel, leadId) {
  const files = listLeadLogFiles(dirRel).filter((x) => x.leadId === Number(leadId));
  if (!files.length) return null;
  files.sort((a, b) => b.mtime - a.mtime);
  return files[0];
}

function leadHasLogsForProduct(productId, leadId) {
  const product = getProduct(productId);
  for (const rel of Object.values(product.logDirs || {})) {
    if (findLatestFileForLead(rel, leadId)) return true;
  }
  return false;
}

function otherProductId(productId) {
  return productId === 'personal-loan' ? 'business-loan' : 'personal-loan';
}

/**
 * When an explicit leadId has no logs for the selected product, explain if it
 * belongs to the other product type.
 */
function assertLeadMatchesProduct(productId, leadId, product) {
  if (leadHasLogsForProduct(productId, leadId)) return;
  const otherId = otherProductId(productId);
  const other = getProduct(otherId);
  if (leadHasLogsForProduct(otherId, leadId)) {
    const err = new Error(
      `Lead ${leadId} belongs to ${other.loanType} (Product Type: ${other.label}), not ${product.loanType}. Switch Loan Type to ${other.loanType} and try again.`
    );
    err.status = 400;
    throw err;
  }
  const err = new Error(
    `No logs found for lead ${leadId} under ${product.label} (or the other product type).`
  );
  err.status = 404;
  throw err;
}

/**
 * Highest numeric leadId that has at least one log under this product's dirs.
 */
export function resolveLatestLeadId(productId) {
  const product = getProduct(productId);
  const dirs = Object.values(product.logDirs || {});
  let maxId = null;
  for (const rel of dirs) {
    for (const f of listLeadLogFiles(rel)) {
      if (maxId == null || f.leadId > maxId) maxId = f.leadId;
    }
  }
  return maxId;
}

function parseLeadSubmission(text) {
  const events = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      events.push(JSON.parse(t));
    } catch {
      /* skip */
    }
  }
  const lead = events.find((e) => e.event === 'LEAD_SUBMIT_SUCCESS') || null;
  const loanApp = events.find((e) => e.event === 'LOAN_APP_SUBMIT_SUCCESS') || null;
  const leadName =
    lead?.leadName ||
    loanApp?.leadName ||
    lead?.fields?.fullName ||
    loanApp?.fields?.applicantName ||
    null;
  return { events, lead, loanApp, leadName, rawLineCount: events.length };
}

function parseBureauLog(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const info = lines.filter((l) => /\| INFO\s+\|/.test(l) || /INFO/.test(l)).slice(0, 80);
  return {
    lineCount: lines.length,
    previewLines: info.length ? info : lines.slice(0, 40),
    text: text.length > 50000 ? text.slice(0, 50000) + '\n…(truncated)' : text,
  };
}

/**
 * @param {{ product: string, leadId?: string|number|null, stages?: string }} opts
 */
export function loadLeadJourney(opts = {}) {
  const productId = opts.product || 'personal-loan';
  if (!['personal-loan', 'business-loan'].includes(productId)) {
    throw new Error('product must be personal-loan or business-loan');
  }
  const product = getProduct(productId);
  const stageParam = String(opts.stages || 'all').toLowerCase();
  const stageKeys = STAGE_KEYS[stageParam];
  if (!stageKeys) {
    throw new Error(
      'stages must be all | lead-submission | bureau | eligibility | scoring'
    );
  }

  let leadId = opts.leadId != null && String(opts.leadId).trim() !== ''
    ? Number(opts.leadId)
    : null;
  const explicitLeadId = leadId != null;
  if (leadId != null && (!Number.isFinite(leadId) || leadId <= 0)) {
    throw new Error('leadId must be a positive number');
  }

  if (leadId == null) {
    leadId = resolveLatestLeadId(productId);
  }
  if (leadId == null) {
    const err = new Error(`No lead logs found for ${product.label}`);
    err.status = 404;
    throw err;
  }

  if (explicitLeadId) {
    assertLeadMatchesProduct(productId, leadId, product);
  }

  const logDirs = product.logDirs;
  const files = {};
  const missing = [];
  const stages = {};
  let leadName = null;

  const want = new Set(stageKeys);

  if (want.has('leadSubmission')) {
    const hit = findLatestFileForLead(logDirs.leadSubmission, leadId);
    if (!hit) {
      missing.push('leadSubmission');
      stages.leadSubmission = null;
    } else {
      files.leadSubmission = path.relative(REPO_ROOT, hit.full);
      const parsed = parseLeadSubmission(fs.readFileSync(hit.full, 'utf8'));
      stages.leadSubmission = parsed;
      if (parsed.leadName) leadName = parsed.leadName;
    }
  }

  if (want.has('bureau')) {
    const hit = findLatestFileForLead(logDirs.bureau, leadId);
    if (!hit) {
      missing.push('bureau');
      stages.bureau = null;
    } else {
      files.bureau = path.relative(REPO_ROOT, hit.full);
      stages.bureau = parseBureauLog(fs.readFileSync(hit.full, 'utf8'));
    }
  }

  if (want.has('eligibility')) {
    const hit = findLatestFileForLead(logDirs.eligibility, leadId);
    if (!hit) {
      missing.push('eligibility');
      stages.eligibility = null;
    } else {
      files.eligibility = path.relative(REPO_ROOT, hit.full);
      const parsed = parseEligibilityLog(fs.readFileSync(hit.full, 'utf8'));
      stages.eligibility = parsed;
      if (parsed.meta?.leadName) leadName = parsed.meta.leadName;
    }
  }

  if (want.has('scoring')) {
    const hit = findLatestFileForLead(logDirs.scoring, leadId);
    if (!hit) {
      missing.push('scoring');
      stages.scoring = null;
    } else {
      files.scoring = path.relative(REPO_ROOT, hit.full);
      const parsed = parseEligibilityLog(fs.readFileSync(hit.full, 'utf8'));
      stages.scoring = {
        meta: parsed.meta,
        lenders: parsed.scoring?.length ? parsed.scoring : parsed.lenders,
        scoring: parsed.scoring,
      };
      if (parsed.meta?.leadName) leadName = parsed.meta.leadName;
    }
  }

  const anyLoaded = Object.values(stages).some((v) => v != null);
  if (!anyLoaded) {
    if (explicitLeadId) {
      assertLeadMatchesProduct(productId, leadId, product);
    }
    const err = new Error(
      `No logs for lead ${leadId} under ${product.label} (stages: ${stageParam})`
    );
    err.status = 404;
    throw err;
  }

  return {
    ok: true,
    product: productId,
    loanType: product.loanType,
    leadId,
    leadName,
    stagesFilter: stageParam,
    stagesRequested: stageKeys,
    files,
    missing,
    stages,
  };
}
