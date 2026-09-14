'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Load KEY=VALUE pairs from project-root .env into process.env (does not override existing).
 */
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
function createPool() {
  loadEnvFile();

  const client = (process.env.DATABASE_CLIENT || 'postgres').toLowerCase();
  if (client !== 'postgres' && client !== 'postgresql') {
    throw new Error(
      `Data-Import-Manager requires PostgreSQL (DATABASE_CLIENT=${client}).`
    );
  }

  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL });
  }

  const ssl =
    String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined;

  return new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || 'strapi',
    user: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi',
    ssl,
    max: 5,
  });
}

module.exports = {
  ROOT,
  loadEnvFile,
  createPool,
};
