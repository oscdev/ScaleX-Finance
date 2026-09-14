'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Local wall-clock timestamp for log lines: YYYY-MM-DD HH:MM:SS
 * @param {Date} [d]
 */
function formatLogClock(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * Local timestamp for filenames: YYYYMMDD-HHMMSS
 * @param {Date} [d]
 */
function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * @param {string} logsDir
 * @param {string} basename e.g. import-zipcodes-20260914-182215
 */
function createRunLogger(logsDir, basename) {
  fs.mkdirSync(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `${basename}.log`);
  const stream = fs.createWriteStream(logPath, { flags: 'a' });

  const write = (level, message) => {
    const line = `${formatLogClock()}  ${String(level).padEnd(5)}  ${message}`;
    stream.write(`${line}\n`);
    const consoleFn = level === 'ERROR' ? console.error : console.log;
    consoleFn(line);
  };

  return {
    logPath,
    logBasename: `${basename}.log`,
    info: (msg) => write('INFO', msg),
    warn: (msg) => write('WARN', msg),
    error: (msg) => write('ERROR', msg),
    close: () =>
      new Promise((resolve) => {
        stream.end(() => resolve());
      }),
  };
}

module.exports = {
  createRunLogger,
  formatTimestamp,
  formatLogClock,
};
