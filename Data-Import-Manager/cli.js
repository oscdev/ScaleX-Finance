'use strict';

const { runImport } = require('./lib/runner');
const { loadImporter, listImporters } = require('./lib/importers-registry');

function printUsage() {
  const names = listImporters()
    .map((i) => i.name)
    .join('|');
  console.log(`Usage: node Data-Import-Manager/cli.js <${names}> [--dry-run]

Examples:
  npm run import:zipcodes
  npm run import:zipcodes -- --dry-run
  node Data-Import-Manager/cli.js zipcodes
  node Data-Import-Manager/cli.js zipcodes --dry-run

Browser UI (Next.js, no extra port):
  /data-import-manager
`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const dryRun = args.includes('--dry-run');
  const name = args.find((a) => !a.startsWith('--'));

  if (!name || name === 'help' || name === '-h' || name === '--help') {
    printUsage();
    process.exit(name ? 0 : 1);
  }

  try {
    const { importer, datasetRoot } = loadImporter(name);
    const result = await runImport({ importer, datasetRoot, dryRun });
    process.exit(result.exitCode);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    printUsage();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
