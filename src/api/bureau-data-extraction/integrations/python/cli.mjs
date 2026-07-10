#!/usr/bin/env node
/**
 * CLI wrapper for bureau PDF extraction.
 * Calls the Strapi REST endpoint (requires Strapi running).
 *
 * Usage:
 *   node cli.mjs <leadId> "<leadName>" [loanApplicationId]
 *
 * Env:
 *   STRAPI_URL — base URL (default http://127.0.0.1:<PORT> from .env)
 *   STRAPI_INSECURE — set to 1 to allow self-signed TLS (local nginx/proxy only)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent } from 'undici';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../../../');

function readEnvPort() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return '1337';
  }
  const match = fs.readFileSync(envPath, 'utf8').match(/^PORT=(\d+)/m);
  return match?.[1] ?? '1337';
}

function resolveBaseUrl() {
  if (process.env.STRAPI_URL) {
    return process.env.STRAPI_URL.replace(/\/$/, '');
  }
  return `http://127.0.0.1:${readEnvPort()}`;
}

function isInsecureTlsEnabled() {
  const flag = process.env.STRAPI_INSECURE;
  return flag === '1' || flag === 'true';
}

function buildFetchOptions() {
  if (!isInsecureTlsEnabled()) {
    return {};
  }

  return {
    dispatcher: new Agent({
      connect: { rejectUnauthorized: false },
    }),
  };
}

const leadId = process.argv[2];
const leadName = process.argv[3];
const loanApplicationId = process.argv[4];
const baseUrl = resolveBaseUrl();

if (!leadId || !leadName) {
  console.error('Usage: node cli.mjs <leadId> "<leadName>" [loanApplicationId]');
  process.exit(1);
}

const body = {
  leadId: Number(leadId),
  leadName,
  dataSource: 'PDF_EXTRACTION',
};

if (loanApplicationId) {
  body.loanApplicationId = Number(loanApplicationId);
}

let res;
try {
  res = await fetch(`${baseUrl}/api/cibil-report-summaries/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...buildFetchOptions(),
  });
} catch (err) {
  const code = err?.cause?.code || err?.code;

  if (code === 'ECONNREFUSED') {
    console.error(`Cannot connect to Strapi at ${baseUrl}.`);
    console.error('Start Strapi in another terminal first:');
    console.error('  source .venv/bin/activate && npm run dev');
    console.error('Prefer direct access: http://127.0.0.1:1337 (no TLS/nginx required).');
    process.exit(1);
  }

  if (code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    console.error(`TLS certificate rejected for ${baseUrl}.`);
    console.error('For local dev, either:');
    console.error('  npm run extract:bureau -- <leadId> "<leadName>"   # uses http://127.0.0.1:1337');
    console.error('  STRAPI_URL=https://scalex.local STRAPI_INSECURE=1 npm run extract:bureau -- ...');
    process.exit(1);
  }

  if (code === 'UND_ERR_SOCKET') {
    console.error(`Connection to Strapi closed unexpectedly at ${baseUrl}.`);
    console.error('Strapi may have restarted mid-request (e.g. during long Python extraction).');
    console.error('Wait for Strapi to finish reloading, then retry.');
    process.exit(1);
  }

  throw err;
}

const payload = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error('Extraction failed:', payload?.error?.message || res.statusText);
  process.exit(1);
}

console.log('Extraction completed successfully.');
console.dir(payload, { depth: null });
