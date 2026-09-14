'use strict';

const path = require('node:path');

const MANAGER_ROOT = path.resolve(__dirname, '..');

/**
 * Registry of CSV importers. datasetDir is relative to Data-Import-Manager/.
 * @type {Record<string, { module: string, datasetDir: string, label: string }>}
 */
const IMPORTERS = {
  zipcodes: {
    module: './importers/zipcodes.js',
    datasetDir: 'table/zipcodes',
    label: 'Zip codes → zip_codes_to_lenders',
  },
};

/**
 * @param {string} name
 */
function getImporterEntry(name) {
  return IMPORTERS[name] || null;
}

/**
 * @param {string} name
 */
function loadImporter(name) {
  const entry = getImporterEntry(name);
  if (!entry) {
    throw new Error(`Unknown importer: ${name}`);
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const importer = require(path.join(MANAGER_ROOT, entry.module));
  const datasetRoot = path.join(MANAGER_ROOT, entry.datasetDir);
  return { entry, importer, datasetRoot, managerRoot: MANAGER_ROOT };
}

function listImporters() {
  return Object.entries(IMPORTERS).map(([name, meta]) => ({
    name,
    label: meta.label,
    datasetDir: meta.datasetDir,
  }));
}

module.exports = {
  MANAGER_ROOT,
  IMPORTERS,
  getImporterEntry,
  loadImporter,
  listImporters,
};
