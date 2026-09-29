/**
 * PostgreSQL pool for lender-pincode-tester (project-root DATABASE_* env).
 * Uses root package `pg` (same as Strapi) via createRequire — no nested install required.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(thisDir, '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { Pool } = require('pg');

let pool = null;

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * @returns {import('pg').Pool}
 */
export function getPool() {
  if (pool) return pool;
  loadEnvFile();

  const client = (process.env.DATABASE_CLIENT || 'postgres').toLowerCase();
  if (client !== 'postgres' && client !== 'postgresql') {
    throw new Error(
      `lender-pincode-tester requires PostgreSQL (DATABASE_CLIENT=${client}).`
    );
  }

  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  } else {
    const ssl =
      String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : undefined;

    pool = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT || 5432),
      database: process.env.DATABASE_NAME || 'strapi',
      user: process.env.DATABASE_USERNAME || 'strapi',
      password: process.env.DATABASE_PASSWORD || 'strapi',
      ssl,
      max: 5,
    });
  }

  return pool;
}

export { ROOT };
