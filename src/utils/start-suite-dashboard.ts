import type { Core } from '@strapi/strapi';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

let suiteChild: ChildProcess | null = null;

function isPortInUse(port: number, host = '127.0.0.1'): Promise<boolean> {
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function suiteDepsInstalled(cwd: string): boolean {
  return fs.existsSync(path.join(cwd, 'node_modules', 'express'));
}

function runNpmInstall(
  cwd: string,
  log: { info: (msg: string) => void; warn: (msg: string) => void }
): Promise<void> {
  return new Promise((resolve, reject) => {
    log.info('[suite] Running: npm install --omit=dev (Automation-Testing)');
    const proc = spawn('npm', ['install', '--omit=dev'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    proc.on('error', (err) => {
      reject(new Error(`npm install failed to start: ${err.message}`));
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        const detail = stderr.trim();
        reject(
          new Error(
            detail
              ? `npm install exited with code ${code}: ${detail}`
              : `npm install exited with code ${code}`
          )
        );
        return;
      }
      resolve();
    });
  });
}

async function ensureSuiteDependencies(
  cwd: string,
  log: { info: (msg: string) => void; warn: (msg: string) => void }
): Promise<boolean> {
  if (suiteDepsInstalled(cwd)) return true;
  try {
    await runNpmInstall(cwd, log);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`[suite] npm install failed: ${message}`);
    log.warn('[suite] Manual fallback: cd Automation-Testing && npm install --omit=dev');
    return false;
  }
  if (!suiteDepsInstalled(cwd)) {
    log.warn('[suite] express still missing after npm install');
    log.warn('[suite] Manual fallback: cd Automation-Testing && npm install --omit=dev');
    return false;
  }
  return true;
}

async function waitUntilListening(
  port: number,
  child: ChildProcess,
  timeoutMs: number
): Promise<string | null> {
  const state: { exited: { code: number | null; signal: NodeJS.Signals | null } | null } = {
    exited: null,
  };
  const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
    state.exited = { code, signal };
  };
  child.once('exit', onExit);
  const startedAt = Date.now();
  try {
    while (Date.now() - startedAt < timeoutMs) {
      if (state.exited) {
        const { code, signal } = state.exited;
        return `dashboard exited before listen (code=${code ?? 'null'} signal=${signal || ''})`;
      }
      if (await isPortInUse(port)) return null;
      await delay(200);
    }
    if (state.exited) {
      const { code, signal } = state.exited;
      return `dashboard exited before listen (code=${code ?? 'null'} signal=${signal || ''})`;
    }
    return `dashboard did not bind :${port} within ${timeoutMs}ms`;
  } finally {
    child.off('exit', onExit);
  }
}

/**
 * Start Automation-Testing /suite on :4100 from Strapi bootstrap.
 * Skips if SUITE_DASHBOARD=false or the port is already bound (reload / npm run dashboard).
 */
export async function startAutomationTestingSuite(strapi: Core.Strapi): Promise<void> {
  if (process.env.SUITE_DASHBOARD === 'false') {
    strapi.log.info('[suite] SUITE_DASHBOARD=false — dashboard not started');
    return;
  }

  const port = Number(process.env.SUITE_PORT || 4100);
  if (await isPortInUse(port)) {
    strapi.log.info(`[suite] dashboard already listening on :${port}`);
    return;
  }

  const cwd = path.join(process.cwd(), 'Automation-Testing');
  const entry = path.join(cwd, 'src', 'server.js');
  if (!fs.existsSync(entry)) {
    strapi.log.warn(
      `[suite] Automation-Testing/src/server.js not found (cwd=${process.cwd()})`
    );
    return;
  }

  const depsOk = await ensureSuiteDependencies(cwd, strapi.log);
  if (!depsOk) {
    strapi.log.warn('[suite] dashboard not started — Automation-Testing dependencies missing');
    return;
  }

  const strapiPort = Number(strapi.config.get('server.port')) || 1337;
  let spawnErr: Error | null = null;
  let childStderr = '';

  suiteChild = spawn(process.execPath, [entry], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      SUITE_PORT: String(port),
      STRAPI_URL: process.env.STRAPI_URL || `http://127.0.0.1:${strapiPort}`,
    },
    stdio: ['ignore', 'inherit', 'pipe'],
  });

  suiteChild.stderr?.on('data', (chunk) => {
    const text = String(chunk);
    childStderr += text;
    try {
      process.stderr.write(chunk);
    } catch {
      /* ignore */
    }
  });

  suiteChild.on('error', (err) => {
    spawnErr = err;
    strapi.log.warn(`[suite] failed to start dashboard: ${err.message}`);
    suiteChild = null;
  });
  suiteChild.on('exit', (code, signal) => {
    if (code && code !== 0) {
      const detail = childStderr.trim();
      strapi.log.warn(
        `[suite] dashboard exited code=${code} signal=${signal || ''}${detail ? ` — ${detail.slice(-500)}` : ''}`
      );
    }
    suiteChild = null;
  });

  const waitError = await waitUntilListening(port, suiteChild, 8000);
  if (spawnErr) {
    strapi.log.warn(`[suite] dashboard not started: ${spawnErr.message}`);
    return;
  }
  if (waitError) {
    strapi.log.warn(`[suite] ${waitError}`);
    if (childStderr.trim()) {
      strapi.log.warn(`[suite] stderr: ${childStderr.trim().slice(-800)}`);
    }
    if (suiteChild && !suiteChild.killed) {
      suiteChild.kill('SIGTERM');
    }
    suiteChild = null;
    return;
  }

  strapi.log.info(`[suite] dashboard started → http://127.0.0.1:${port}/suite`);
}
