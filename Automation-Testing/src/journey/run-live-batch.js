/**
 * Sequential Live Run: one default-pool row, or CSV Upload rows (max 5).
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { runLivePipeline } from './run-live-pipeline.js';
import { getProduct } from '../live-payloads.js';
import { clearReportProductDir, reportProductDir } from '../paths.js';

export async function runLiveBatch(opts) {
  const productId = opts.product;
  getProduct(productId);
  const csvRows = Array.isArray(opts.rows) && opts.rows.length ? opts.rows : null;
  const batchId = opts.batchId || randomUUID();
  const results = [];

  if (!csvRows) {
    throw new Error('Live Run requires preflighted CSV rows (default or upload)');
  }

  const runDir = clearReportProductDir(productId);
  if (opts.inputCsv != null) {
    fs.writeFileSync(path.join(runDir, 'input.csv'), opts.inputCsv);
  }

  const runOne = async (pipelineOpts, index, total, cibilFile) => {
    const result = await runLivePipeline(pipelineOpts);
    results.push({
      ...result,
      csvRowNumber: pipelineOpts.csvRowNumber || null,
      cibilFile: cibilFile || result.cibilFile,
    });
    if (typeof opts.onProgress === 'function') {
      opts.onProgress({
        index,
        count: total,
        batchId,
        result: results[results.length - 1],
      });
    }
  };

  const total = csvRows.length;
  const runId = opts.runId || batchId;
  for (let i = 0; i < total; i++) {
    const row = csvRows[i];
    const cibilPath = row.uploads?.find((u) => u.field === 'cibilReport')?.filePath;
    await runOne(
      {
        product: productId,
        confirm: true,
        runId,
        batchId,
        runDir,
        rowCount: total,
        customer: row.customer,
        uploads: row.uploads,
        csvRowNumber: row.rowNumber,
        cibilPath,
      },
      i,
      total,
      cibilPath ? cibilPath.split(/[/\\]/).pop() : undefined
    );
  }

  const hardFails = results.filter((r) => !r.ok);
  return {
    ok: hardFails.length === 0,
    batch: true,
    batchId,
    count: results.length,
    results,
  };
}
