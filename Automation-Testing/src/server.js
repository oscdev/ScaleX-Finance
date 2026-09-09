import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { publish } from './event-bus.js';
import { checkStrapiReachable } from './http-client.js';
import {
  PUBLIC_DIR,
  REPORTS_DIR,
  FIXTURES_DIR,
  defaultProductDir,
  defaultCsvPath,
  defaultExampleCsvPath,
} from './paths.js';
import { runOfflineJourney } from './journey/run-offline-journey.js';
import { runLiveBatch } from './journey/run-live-batch.js';
import { loadLeadJourney } from './journey/load-lead-journey.js';
import { MAX_CSV_ROWS, MAX_DEFAULT_ROWS } from './live-payloads.js';
import { parseAndPreflightLiveRunCsv } from './csv-live-run.js';
import { saveUploadedLiveRunFiles, removeStagedLiveRunFiles, CSV_DOCS_PAIR_ERROR } from './live-run-docs.js';
import { takeNextDefaultRow } from './doc-hash-ring.js';

const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isMain = invoked === thisFile;

function resolveSuitePort() {
  if (process.env.SUITE_PORT) return Number(process.env.SUITE_PORT);
  if (isMain && process.env.PORT) return Number(process.env.PORT);
  return 4100;
}

const PORT = resolveSuitePort();
const BASE_PATH = (process.env.BASE_PATH || '/suite').replace(/\/$/, '');

/** In-memory Live Run status (survives long bureau polls without holding the HTTP proxy open). */
const liveRuns = new Map();

const liveUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 50 },
});

function parseConfirm(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const router = express.Router();

  router.get('/api/health', async (_req, res) => {
    const strapiReachable = await checkStrapiReachable();
    res.json({
      ok: true,
      strapiReachable,
      strapiUrl: process.env.STRAPI_URL || 'http://127.0.0.1:1337',
      basePath: BASE_PATH,
      port: PORT,
    });
  });

  router.get('/api/pipeline-docs', (req, res) => {
    const product = String(req.query.product || 'personal-loan');
    const section = String(req.query.section || '');
    const allowedProducts = ['personal-loan', 'business-loan'];
    const allowedSections = ['lead-submission', 'bureau', 'eligibility', 'scoring'];
    if (!allowedProducts.includes(product)) {
      return res.status(400).json({ error: 'product must be personal-loan or business-loan' });
    }
    if (!allowedSections.includes(section)) {
      return res.status(400).json({
        error: 'section must be lead-submission | bureau | eligibility | scoring',
      });
    }
    const docsPath = path.join(FIXTURES_DIR, 'pipeline-docs.json');
    if (!fs.existsSync(docsPath)) {
      return res.status(503).json({
        error: 'pipeline-docs.json missing — run npm run build:pipeline-docs',
      });
    }
    try {
      const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
      const items = docs?.products?.[product]?.[section];
      if (!Array.isArray(items)) {
        return res.status(404).json({ error: 'No docs for that product/section' });
      }
      res.json({
        ok: true,
        product,
        section,
        generatedAt: docs.generatedAt || null,
        itemCount: items.length,
        items,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to load pipeline docs' });
    }
  });

  /** Offline journey report (CLI companion; optional Fail Lab). Not used by the /suite UI. */
  router.post('/api/journey', async (req, res) => {
    const product = req.body?.product || 'personal-loan';
    const failLab = Boolean(req.body?.failLab);
    if (!['personal-loan', 'business-loan'].includes(product)) {
      return res.status(400).json({ error: 'product must be personal-loan or business-loan' });
    }
    try {
      const result = await runOfflineJourney({ product, failLab });
      res.json({
        ok: true,
        runId: result.runId,
        reportUrl: `${BASE_PATH}/${result.reportUrl}`,
        eventsUrl: `${BASE_PATH}/reports/runs/${product}/events.json`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Journey failed' });
    }
  });

  router.get('/api/journey-demo', (req, res) => {
    const product = String(req.query.product || 'personal-loan');
    const leadId = req.query.leadId != null && String(req.query.leadId).trim() !== ''
      ? String(req.query.leadId).trim()
      : null;
    const stages = String(req.query.stages || 'all');
    try {
      const result = loadLeadJourney({ product, leadId, stages });
      res.json(result);
    } catch (err) {
      const status = err.status || (String(err.message || '').includes('must be') ? 400 : 500);
      res.status(status).json({ error: err.message || 'Journey demo failed' });
    }
  });

  router.get('/api/live-run/example.csv', (req, res) => {
    const product = String(req.query.product || 'personal-loan');
    if (!['personal-loan', 'business-loan'].includes(product)) {
      return res.status(400).json({ error: 'product must be personal-loan or business-loan' });
    }
    const filePath = defaultExampleCsvPath(product);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Example CSV not found' });
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${product}-live-run.example.csv"`);
    res.send(fs.readFileSync(filePath, 'utf8'));
  });

  router.post(
    '/api/live-run',
    (req, res, next) => {
      const ct = String(req.headers['content-type'] || '');
      if (!ct.includes('multipart/form-data')) return next();
      liveUpload.fields([
        { name: 'csv', maxCount: 1 },
        { name: 'documents', maxCount: 40 },
      ])(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
        next();
      });
    },
    async (req, res) => {
    const product = req.body?.product || 'personal-loan';
    const confirm = parseConfirm(req.body?.confirm);
    if (!confirm) {
      return res.status(400).json({
        error: 'confirm: true is required — Live Run creates real leads tagged [SUITE-TEST]',
      });
    }
    if (!['personal-loan', 'business-loan'].includes(product)) {
      return res.status(400).json({ error: 'product must be personal-loan or business-loan' });
    }

    const csvFile = req.files?.csv?.[0];
    const pdfFiles = req.files?.documents || [];
    const jsonCsv = typeof req.body?.csv === 'string' ? req.body.csv.trim() : '';
    const hasCsv = Boolean(csvFile) || Boolean(jsonCsv);
    const hasPdfs = pdfFiles.length > 0;

    let rows = null;
    let count = 1;
    let csvSource = 'default';
    let stagedDocsDir = null;
    try {
      if (hasCsv !== hasPdfs) {
        throw new Error(CSV_DOCS_PAIR_ERROR);
      }
      if (hasCsv) {
        const csvBuffer = csvFile ? csvFile.buffer : Buffer.from(jsonCsv, 'utf8');
        const saved = saveUploadedLiveRunFiles({
          productId: product,
          csvBuffer,
          csvOriginalName: csvFile?.originalname,
          pdfFiles,
        });
        stagedDocsDir = saved.docsDir;
        const csvText = csvBuffer.toString('utf8');
        rows = parseAndPreflightLiveRunCsv(csvText, product, {
          docsDir: saved.docsDir,
          maxRows: MAX_CSV_ROWS,
          uniquify: false,
          fillOptional: false,
        });
        csvSource = 'upload';
      } else {
        const poolCsvPath = defaultCsvPath(product);
        if (!fs.existsSync(poolCsvPath)) {
          throw new Error(
            `Default CSV missing: documents/default/${product}/sample-default-${product}.csv`
          );
        }
        const csvText = fs.readFileSync(poolCsvPath, 'utf8');
        rows = parseAndPreflightLiveRunCsv(csvText, product, {
          docsDir: defaultProductDir(product),
          maxRows: MAX_DEFAULT_ROWS,
          uniquify: true,
          fillOptional: true,
        });
        rows = takeNextDefaultRow(rows, product);
        csvSource = 'default';
      }
      count = rows.length;
    } catch (err) {
      removeStagedLiveRunFiles(stagedDocsDir);
      return res.status(400).json({ error: err.message || 'Invalid Live Run request' });
    }
    const reachable = await checkStrapiReachable();
    if (!reachable) {
      removeStagedLiveRunFiles(stagedDocsDir);
      return res.status(503).json({
        error: 'Strapi is not reachable — start npm run dev in the project root',
        strapiReachable: false,
      });
    }

    const runId = randomUUID();
    liveRuns.set(runId, {
      status: 'running',
      product,
      count,
      batch: count > 1,
      csv: csvSource === 'upload',
      source: csvSource,
      startedAt: new Date().toISOString(),
    });

    res.status(202).json({
      accepted: true,
      ok: true,
      runId,
      count,
      batch: count > 1,
      status: 'running',
      message:
        count > 1
          ? `Live Run of ${count} leads started — watch the timeline; status at GET /api/live-run/${runId}`
          : 'Live Run started — watch the timeline; status at GET /api/live-run/:runId',
      statusUrl: `${BASE_PATH}/api/live-run/${runId}`,
    });

    setImmediate(() => {
      const onProgress = ({ index, count: total, result }) => {
        const cur = liveRuns.get(runId) || {};
        liveRuns.set(runId, {
          ...cur,
          status: 'running',
          progress: `${index + 1}/${total}`,
          lastLeadId: result?.leadId,
        });
        publish({
          stage: 'live_run_progress',
          message: `Lead ${index + 1}/${total} finished (lead ${result?.leadId ?? '—'})`,
          runId,
          rowIndex: index,
          leadId: result?.leadId,
          ts: new Date().toISOString(),
        });
      };

      runLiveBatch({
        product,
        confirm: true,
        rows,
        batchId: runId,
        runId,
        inputCsv: hasCsv ? (csvFile ? csvFile.buffer : jsonCsv) : undefined,
        onProgress,
      })
        .then((batch) => {
          const entries = (batch.results || []).map((r) => ({
            ok: r.ok,
            runId: r.runId,
            leadId: r.leadId,
            loanAppId: r.loanAppId,
            cibilFile: r.cibilFile,
            errors: r.errors,
            reportUrl: r.report?.relativePath
              ? `${BASE_PATH}/${r.report.relativePath}`
              : `${BASE_PATH}/reports/runs/${product}/report.html`,
            eventsUrl: r.eventsRelativePath
              ? `${BASE_PATH}/${r.eventsRelativePath}`
              : `${BASE_PATH}/reports/runs/${product}/events.json`,
          }));
          const first = entries[0];
          liveRuns.set(runId, {
            status: batch.ok ? 'completed' : 'completed_with_issues',
            product,
            count,
            batch: count > 1,
            startedAt: liveRuns.get(runId)?.startedAt,
            finishedAt: new Date().toISOString(),
            result: {
              ok: batch.ok,
              runId,
              batch: count > 1,
              count,
              leadId: first?.leadId,
              loanAppId: first?.loanAppId,
              entries,
              errors: batch.results?.flatMap((r) => r.errors || []) || [],
              reportUrl: first?.reportUrl,
              eventsUrl: first?.eventsUrl,
            },
          });
          publish({
            stage: 'live_run_complete',
            message: batch.ok
              ? `Live Run completed (${count} lead${count === 1 ? '' : 's'})`
              : 'Live Run finished with issues',
            runId,
            leadId: first?.leadId,
            ok: batch.ok,
            count,
            reportUrl: first?.reportUrl,
            ts: new Date().toISOString(),
          });
        })
        .catch((err) => {
          const message = err?.message || 'Live Run failed';
          liveRuns.set(runId, {
            status: 'failed',
            product,
            count,
            startedAt: liveRuns.get(runId)?.startedAt,
            finishedAt: new Date().toISOString(),
            error: message,
          });
          publish({
            stage: 'live_run_failed',
            message,
            runId,
            error: true,
            ts: new Date().toISOString(),
          });
        })
        .finally(() => {
          removeStagedLiveRunFiles(stagedDocsDir);
        });
    });
  });

  router.get('/api/live-run/:runId', (req, res) => {
    const entry = liveRuns.get(req.params.runId);
    if (entry) return res.json(entry);
    return res.status(404).json({ error: 'Unknown runId' });
  });

  router.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use(BASE_PATH, router);
  app.use(`${BASE_PATH}/`, router);

  app.use(BASE_PATH, express.static(PUBLIC_DIR, { index: false }));
  app.use(`${BASE_PATH}/reports`, express.static(REPORTS_DIR));

  return app;
}

function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

/** Bind :4100. No-ops if the port is already in use (Strapi-embedded or a second CLI). */
export async function startSuiteDashboard(opts = {}) {
  const port = Number(opts.port || PORT);
  if (await isPortInUse(port)) {
    console.log(`ScaleX Automation Testing Suite already on http://127.0.0.1:${port}${BASE_PATH}`);
    return null;
  }
  const app = createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`ScaleX Automation Testing Suite → http://127.0.0.1:${port}${BASE_PATH}`);
      console.log(`Strapi (optional): ${process.env.STRAPI_URL || 'http://127.0.0.1:1337'}`);
      resolve(server);
    });
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`ScaleX Automation Testing Suite already on http://127.0.0.1:${port}${BASE_PATH}`);
        resolve(null);
        return;
      }
      reject(err);
    });
  });
}

if (isMain) {
  startSuiteDashboard().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
