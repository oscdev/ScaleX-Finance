'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createPool } = require('./db');
const { parseCsvFile, writeErrorsCsv } = require('./csv');
const { createRunLogger, formatTimestamp } = require('./logger');

/**
 * Move upload CSV to processed/ with timestamp suffix.
 * @param {string} srcPath
 * @param {string} processedDir
 * @param {string} stamp
 */
function moveToProcessed(srcPath, processedDir, stamp) {
  fs.mkdirSync(processedDir, { recursive: true });
  const base = path.basename(srcPath, path.extname(srcPath));
  const ext = path.extname(srcPath) || '.csv';
  let dest = path.join(processedDir, `${base}_${stamp}${ext}`);
  let n = 1;
  while (fs.existsSync(dest)) {
    dest = path.join(processedDir, `${base}_${stamp}_${n}${ext}`);
    n += 1;
  }
  fs.renameSync(srcPath, dest);
  return dest;
}

/**
 * @param {object} opts
 * @param {object} opts.importer
 * @param {string} opts.datasetRoot
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.onlyFile]
 */
async function runImport({ importer, datasetRoot, dryRun = false, onlyFile }) {
  const uploadDir = path.join(datasetRoot, 'upload');
  const processedDir = path.join(datasetRoot, 'processed');
  const logsDir = path.join(datasetRoot, 'logs');

  const stamp = formatTimestamp();
  const logger = createRunLogger(logsDir, `import-${importer.name}-${stamp}`);
  const runStarted = Date.now();

  logger.info(
    `Import started — ${importer.name} → ${importer.table} (dry run: ${dryRun ? 'yes' : 'no'})`
  );

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let files = fs
    .readdirSync(uploadDir)
    .filter((f) => f.toLowerCase().endsWith('.csv') && !f.startsWith('.'))
    .sort()
    .map((f) => path.join(uploadDir, f));

  if (onlyFile) {
    const target = path.basename(onlyFile);
    files = files.filter((f) => path.basename(f) === target);
    if (files.length === 0) {
      logger.error(`Upload file not found in upload/: ${target}`);
      logger.info('Import finished — 0 file(s), FAILED');
      await logger.close();
      return {
        ok: false,
        filesProcessed: 0,
        exitCode: 1,
        summaries: [],
        logPath: logger.logPath,
        logBasename: logger.logBasename,
      };
    }
  }

  if (files.length === 0) {
    logger.warn('No CSV files found in upload/');
    logger.info('Import finished — 0 file(s), OK');
    await logger.close();
    return {
      ok: true,
      filesProcessed: 0,
      exitCode: 0,
      summaries: [],
      logPath: logger.logPath,
      logBasename: logger.logBasename,
    };
  }

  let pool;
  try {
    pool = createPool();
    await pool.query('SELECT 1');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Database connection failed — ${message}`);
    logger.info('Import finished — 0 file(s), FAILED');
    await logger.close();
    if (pool) await pool.end().catch(() => {});
    return {
      ok: false,
      filesProcessed: 0,
      exitCode: 1,
      summaries: [],
      logPath: logger.logPath,
      logBasename: logger.logBasename,
    };
  }

  let anyFatal = false;
  let filesProcessed = 0;
  /** @type {object[]} */
  const summaries = [];

  try {
    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const fileStarted = Date.now();
      logger.info(`Processing file — ${fileName}`);

      try {
        const { headers, rows } = parseCsvFile(filePath);
        const missing = (importer.requiredHeaders || []).filter(
          (h) => !headers.includes(h)
        );
        if (missing.length) {
          throw new Error(
            `Missing required CSV columns: ${missing.join(', ')}. Found: ${headers.join(', ') || '(none)'}`
          );
        }

        logger.info(
          `File: ${fileName} — ${rows.length} row(s); columns: ${headers.join(', ')}`
        );

        const result = await importer.processFile({
          pool,
          headers,
          rows,
          filePath,
          fileName,
          dryRun,
          logger,
          logsDir,
          stamp,
          writeErrorsCsv,
        });

        const durationSec = ((Date.now() - fileStarted) / 1000).toFixed(1);
        const summary = {
          file: fileName,
          durationMs: Date.now() - fileStarted,
          ...result,
        };
        summaries.push(summary);
        logger.info(
          `File done — inserted ${summary.inserted ?? 0}, updated ${summary.updated ?? 0}, rejected ${summary.rejected ?? 0} (${durationSec}s)`
        );

        if (!dryRun && result.moveToProcessed === true) {
          const dest = moveToProcessed(filePath, processedDir, stamp);
          logger.info(`Moved ${fileName} → processed/${path.basename(dest)}`);
        } else if (dryRun) {
          logger.info(`Dry run — left ${fileName} in upload/`);
        } else {
          logger.info(
            `Left ${fileName} in upload/ — ${summary.inserted ?? 0} inserted, ${summary.rejected ?? 0} rejected (fix CSV and retry)`
          );
        }

        filesProcessed += 1;
      } catch (err) {
        anyFatal = true;
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`File failed — ${fileName}: ${message}`);
        logger.info(`Left ${fileName} in upload/ for retry`);
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }

  const status = anyFatal ? 'FAILED' : 'OK';
  const durationSec = ((Date.now() - runStarted) / 1000).toFixed(1);
  logger.info(
    `Import finished — ${filesProcessed} file(s), ${status} (${durationSec}s)`
  );
  await logger.close();

  return {
    ok: !anyFatal,
    filesProcessed,
    exitCode: anyFatal ? 1 : 0,
    summaries,
    logPath: logger.logPath,
    logBasename: logger.logBasename,
  };
}

module.exports = {
  runImport,
  moveToProcessed,
};
