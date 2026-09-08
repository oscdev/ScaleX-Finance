/**
 * Run offline fixture matrix against production rule modules.
 * Usage: npm run test:fixtures [-- --id=eligibility:pl:PL-AGE]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCase } from './evaluators.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, '../../fixtures/coverage-registry.json');
const reportsDir = join(__dirname, '../../reports/fixtures');

function parseArgs(argv) {
  const idArg = argv.find((a) => a.startsWith('--id='));
  return { singleId: idArg ? idArg.slice(5) : null };
}

function loadRegistry() {
  const raw = readFileSync(registryPath, 'utf8');
  return JSON.parse(raw);
}

function outcomesForEntry(entry) {
  if (entry.requiresCatalogAssert) {
    return ['CATALOG'];
  }
  const outcomes = ['PASS', 'FAIL'];
  if (entry.supportsSkip) {
    outcomes.push('SKIP');
  }
  return outcomes;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(report) {
  const rows = report.results
    .map((r) => {
      const cls = r.ok ? 'pass' : 'fail';
      return `<tr class="${cls}"><td>${escapeHtml(r.entryId)}</td><td>${escapeHtml(r.outcome)}</td><td>${r.ok ? 'OK' : 'FAIL'}</td><td><pre>${escapeHtml(JSON.stringify(r.actual, null, 0))}</pre></td></tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Fixture Matrix — ${escapeHtml(report.generatedAt)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    tr.pass td:nth-child(3) { color: #15803d; font-weight: 600; }
    tr.fail td:nth-child(3) { color: #b91c1c; font-weight: 600; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; max-width: 420px; }
    .summary { margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Fixture Coverage Matrix</h1>
  <div class="summary">
    <p>Total entries: <strong>${report.totalEntries}</strong> · Cases run: <strong>${report.totalCases}</strong> · Passed: <strong>${report.passed}</strong> · Failed: <strong>${report.failed}</strong></p>
  </div>
  <table>
    <thead><tr><th>Entry</th><th>Outcome</th><th>Status</th><th>Actual</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function main() {
  const { singleId } = parseArgs(process.argv.slice(2));
  const registry = loadRegistry();
  let entries = registry.entries;

  if (singleId) {
    entries = entries.filter((e) => e.id === singleId);
    if (!entries.length) {
      console.error(`No registry entry for id=${singleId}`);
      process.exit(1);
    }
  }

  const results = [];
  let failed = 0;
  let passed = 0;
  let totalCases = 0;

  for (const entry of entries) {
    const outcomes = outcomesForEntry(entry);

    for (const outcome of outcomes) {
      totalCases += 1;
      const run = runCase(entry.id, outcome);
      const row = {
        entryId: entry.id,
        type: entry.type,
        outcome,
        ok: run.ok,
        actual: run.actual,
        expected: run.expected,
        detail: run.detail,
      };
      results.push(row);
      if (run.ok) passed += 1;
      else failed += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    totalCases,
    passed,
    failed,
    results,
  };

  mkdirSync(reportsDir, { recursive: true });
  const jsonPath = join(reportsDir, 'latest-results.json');
  const htmlPath = join(reportsDir, 'latest.html');
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(htmlPath, buildHtml(report), 'utf8');

  console.log(`Fixture run: ${passed}/${totalCases} passed (${entries.length} entries)`);
  console.log(`  → ${jsonPath}`);
  console.log(`  → ${htmlPath}`);

  if (failed > 0) {
    const sample = results.filter((r) => !r.ok).slice(0, 10);
    console.error('\nFailures (first 10):');
    for (const f of sample) {
      console.error(`  ${f.entryId} [${f.outcome}]: expected=${JSON.stringify(f.expected)} actual=${JSON.stringify(f.actual)}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
