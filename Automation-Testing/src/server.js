import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { publish } from './event-bus.js';
import { checkStrapiReachable } from './http-client.js';
import {
  PUBLIC_DIR,
  REPORTS_DIR,
  FIXTURES_DIR,
} from './paths.js';
import { runOfflineJourney } from './journey/run-offline-journey.js';
import { runLivePipeline } from './journey/run-live-pipeline.js';
import { loadLeadJourney } from './journey/load-lead-journey.js';

const PORT = Number(process.env.PORT || 4100);
const BASE_PATH = (process.env.BASE_PATH || '/suite').replace(/\/$/, '');

/** In-memory Live Run status (survives long bureau polls without holding the HTTP proxy open). */
const liveRuns = new Map();

function createApp() {
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
        reportUrl: `${BASE_PATH}/reports/runs/${result.runId}/report-${result.runId}.html`,
        eventsUrl: `${BASE_PATH}/reports/runs/${result.runId}/events.json`,
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

  router.post('/api/live-run', async (req, res) => {
    const product = req.body?.product || 'personal-loan';
    const confirm = Boolean(req.body?.confirm);
    if (!confirm) {
      return res.status(400).json({
        error: 'confirm: true is required — Live Run creates real leads tagged [SUITE-TEST]',
      });
    }
    if (!['personal-loan', 'business-loan'].includes(product)) {
      return res.status(400).json({ error: 'product must be personal-loan or business-loan' });
    }
    const reachable = await checkStrapiReachable();
    if (!reachable) {
      return res.status(503).json({
        error: 'Strapi is not reachable — start npm run dev in the project root',
        strapiReachable: false,
      });
    }

    // Return immediately so Next.js /suite proxy does not time out during bureau poll.
    const runId = randomUUID();
    liveRuns.set(runId, {
      status: 'running',
      product,
      startedAt: new Date().toISOString(),
    });

    res.status(202).json({
      accepted: true,
      ok: true,
      runId,
      status: 'running',
      message: 'Live Run started — watch the timeline; status at GET /api/live-run/:runId',
      statusUrl: `${BASE_PATH}/api/live-run/${runId}`,
    });

    setImmediate(() => {
      runLivePipeline({ product, confirm: true, runId })
        .then((result) => {
          const reportUrl = `${BASE_PATH}/${result.report.relativePath}`;
          liveRuns.set(runId, {
            status: result.ok ? 'completed' : 'completed_with_issues',
            product,
            startedAt: liveRuns.get(runId)?.startedAt,
            finishedAt: new Date().toISOString(),
            result: {
              ok: result.ok,
              runId: result.runId,
              leadId: result.leadId,
              loanAppId: result.loanAppId,
              errors: result.errors,
              reportUrl,
              eventsUrl: `${BASE_PATH}/reports/runs/${result.runId}/events.json`,
            },
          });
          publish({
            stage: 'live_run_complete',
            message: result.ok ? 'Live Run completed' : 'Live Run finished with issues',
            runId,
            leadId: result.leadId,
            ok: result.ok,
            reportUrl,
            ts: new Date().toISOString(),
          });
        })
        .catch((err) => {
          const message = err?.message || 'Live Run failed';
          liveRuns.set(runId, {
            status: 'failed',
            product,
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
        });
    });
  });

  router.get('/api/live-run/:runId', (req, res) => {
    const entry = liveRuns.get(req.params.runId);
    if (entry) return res.json(entry);

    const runDir = path.join(REPORTS_DIR, 'runs', req.params.runId);
    const runJson = path.join(runDir, 'run.json');
    if (fs.existsSync(runJson)) {
      try {
        const run = JSON.parse(fs.readFileSync(runJson, 'utf8'));
        return res.json({
          status: 'completed',
          result: {
            ok: !(run.errors || []).filter((e) => e.severity !== 'warning').length,
            runId: req.params.runId,
            leadId: run.meta?.leadId,
            loanAppId: run.meta?.loanAppId,
            errors: run.errors,
            reportUrl: `${BASE_PATH}/reports/runs/${req.params.runId}/report-${req.params.runId}.html`,
            eventsUrl: `${BASE_PATH}/reports/runs/${req.params.runId}/events.json`,
          },
        });
      } catch {
        /* fall through */
      }
    }
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

const app = createApp();
app.listen(PORT, () => {
  console.log(`ScaleX Automation Testing Suite → http://127.0.0.1:${PORT}${BASE_PATH}`);
  console.log(`Strapi (optional): ${process.env.STRAPI_URL || 'http://127.0.0.1:1337'}`);
});
