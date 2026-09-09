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
    strapi.log.warn('[suite] Automation-Testing/src/server.js not found');
    return;
  }

  const strapiPort = Number(strapi.config.get('server.port')) || 1337;
  suiteChild = spawn(process.execPath, [entry], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      SUITE_PORT: String(port),
      STRAPI_URL: process.env.STRAPI_URL || `http://127.0.0.1:${strapiPort}`,
    },
    stdio: 'inherit',
  });

  suiteChild.on('error', (err) => {
    strapi.log.warn(`[suite] failed to start dashboard: ${err.message}`);
    suiteChild = null;
  });
  suiteChild.on('exit', (code, signal) => {
    if (code && code !== 0) {
      strapi.log.warn(`[suite] dashboard exited code=${code} signal=${signal || ''}`);
    }
    suiteChild = null;
  });

  strapi.log.info(`[suite] dashboard started → http://127.0.0.1:${port}/suite`);
}
