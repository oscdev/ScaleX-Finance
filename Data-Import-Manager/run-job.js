'use strict';

/**
 * Invoked by Next API (and optionally CLI tooling) to run one import and print JSON.
 * Usage:
 *   node Data-Import-Manager/run-job.js zipcodes [--dry-run] [--file=name.csv]
 */

const { runImport } = require('./lib/runner');
const { loadImporter, listImporters } = require('./lib/importers-registry');

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const cmd = args[0];

  if (cmd === 'list') {
    process.stdout.write(JSON.stringify({ importers: listImporters() }));
    return;
  }

  if (cmd === 'meta') {
    const name = args[1] || 'zipcodes';
    const { importer, entry } = loadImporter(name);
    process.stdout.write(
      JSON.stringify({
        name: importer.name,
        table: importer.table,
        requiredHeaders: importer.requiredHeaders,
        label: entry.label,
        datasetDir: entry.datasetDir,
      })
    );
    return;
  }

  const dryRun = args.includes('--dry-run');
  const fileArg = args.find((a) => a.startsWith('--file='));
  const onlyFile = fileArg ? fileArg.slice('--file='.length) : undefined;
  const name = args.find((a) => !a.startsWith('--'));

  if (!name) {
    process.stderr.write('Missing importer name\n');
    process.exit(1);
  }

  const { importer, datasetRoot } = loadImporter(name);
  const result = await runImport({ importer, datasetRoot, dryRun, onlyFile });
  process.stdout.write(
    JSON.stringify({
      ok: result.ok,
      exitCode: result.exitCode,
      filesProcessed: result.filesProcessed,
      summaries: result.summaries,
      logBasename: result.logBasename,
      table: importer.table,
      dryRun,
    })
  );
  process.exit(result.exitCode);
}

main().catch((err) => {
  process.stderr.write(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  );
  process.exit(1);
});
