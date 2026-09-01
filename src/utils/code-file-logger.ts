import fs from 'fs';
import path from 'path';

export const CODE_LOG_ROOT = path.join(process.cwd(), 'logs');

export interface LeadLogContext {
  leadId?: number | string | null;
  leadName?: string | null;
}

/** UTC calendar day stamp for daily file logs: YYYY-MM-DD */
export function utcDateStamp(d = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Strip spaces / unsafe chars — same idea as api_uploads folder names. */
export function sanitizeLeadName(name: string | null | undefined): string {
  const cleaned = String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '');
  return cleaned || 'Unknown';
}

export function moduleLogDir(moduleName: string): string {
  return path.join(CODE_LOG_ROOT, moduleName);
}

/** File stem for nested modules (e.g. personal-loan/pl-eligibility → pl-eligibility). */
export function moduleLogBasename(moduleName: string): string {
  return path.basename(moduleName.replace(/\\/g, '/'));
}

/**
 * Module-level (no lead): logs/<module>/<basename>_YYYY-MM-DD.log
 * Nested example: logs/personal-loan/pl-eligibility/pl-eligibility_YYYY-MM-DD.log
 */
export function moduleDailyLogPath(moduleName: string, d = new Date()): string {
  const stem = moduleLogBasename(moduleName);
  return path.join(moduleLogDir(moduleName), `${stem}_${utcDateStamp(d)}.log`);
}

/**
 * Per-lead: logs/<module>/<leadId>-<NameNoSpaces>_YYYY-MM-DD.log
 * Example: logs/personal-loan/pl-eligibility/125-TestDeveloper_2026-08-07.log
 */
export function moduleLeadLogPath(
  moduleName: string,
  leadId: number | string,
  leadName: string | null | undefined,
  d = new Date()
): string {
  const stem = `${leadId}-${sanitizeLeadName(leadName)}`;
  return path.join(moduleLogDir(moduleName), `${stem}_${utcDateStamp(d)}.log`);
}

/** Resolve path: lead file when leadId present, else module daily file. */
export function resolveModuleLogPath(
  moduleName: string,
  lead?: LeadLogContext | null,
  d = new Date()
): string {
  if (lead?.leadId != null && String(lead.leadId).trim() !== '') {
    return moduleLeadLogPath(moduleName, lead.leadId, lead.leadName, d);
  }
  return moduleDailyLogPath(moduleName, d);
}

/** @deprecated Use moduleDailyLogPath / moduleLeadLogPath */
export function moduleRunLogPath(moduleName: string, d = new Date()): string {
  return moduleDailyLogPath(moduleName, d);
}

/**
 * Code-level file logging toggle (Global Setting).
 * Missing / null settings → enabled (default true).
 */
export async function isCodeLevelLoggingEnabled(strapi?: any): Promise<boolean> {
  if (!strapi?.db?.query) return true;
  try {
    const settings = (await strapi.db
      .query('api::global-setting.global-setting')
      .findOne({})) as { codeLevelLoggingIsEnabled?: boolean | null } | null;
    if (!settings) return true;
    if (settings.codeLevelLoggingIsEnabled == null) return true;
    return settings.codeLevelLoggingIsEnabled !== false;
  } catch {
    return true;
  }
}

export function ensureModuleLogDir(moduleName: string): string {
  const dir = moduleLogDir(moduleName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Delete an existing per-lead log file so the next append starts a fresh run.
 * No-op when leadId is missing (module daily files keep append behavior).
 */
export function resetModuleLeadLog(
  moduleName: string,
  lead?: LeadLogContext | null,
  d = new Date()
): string {
  if (lead?.leadId == null || String(lead.leadId).trim() === '') return '';
  try {
    ensureModuleLogDir(moduleName);
    const file = resolveModuleLogPath(moduleName, lead, d);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    return file;
  } catch {
    return '';
  }
}

/**
 * Append a line when code-level logging is on.
 * With leadId → logs/<module>/<leadId>-<Name>_YYYY-MM-DD.log
 * Without → logs/<module>/<module>_YYYY-MM-DD.log
 */
export async function appendModuleLog(
  moduleName: string,
  line: string,
  strapi?: any,
  lead?: LeadLogContext | null
): Promise<string> {
  try {
    if (!(await isCodeLevelLoggingEnabled(strapi))) return '';
    ensureModuleLogDir(moduleName);
    const file = resolveModuleLogPath(moduleName, lead);
    fs.appendFileSync(file, `${line}\n`, 'utf8');
    return file;
  } catch {
    return '';
  }
}

/** Sync check when settings were already loaded (avoids await in tight loops). */
export function appendModuleLogIfEnabled(
  moduleName: string,
  line: string,
  enabled: boolean,
  lead?: LeadLogContext | null
): string {
  if (!enabled) return '';
  try {
    ensureModuleLogDir(moduleName);
    const file = resolveModuleLogPath(moduleName, lead);
    fs.appendFileSync(file, `${line}\n`, 'utf8');
    return file;
  } catch {
    return '';
  }
}

/** Upsert ADMIN_UPDATE entries into a single cumulative JSON line per lead log file. */
export async function mergeAdminUpdateLogLine(
  moduleName: string,
  payload: {
    timestamp: string;
    leadId: number | string;
    leadName?: string | null;
    loanApplicationId?: number | string | null;
    source?: string;
    updates: Array<{
      timestamp: string;
      form: string;
      field: string;
      value: unknown;
    }>;
  },
  strapi?: any,
  lead?: LeadLogContext | null
): Promise<string> {
  try {
    if (!(await isCodeLevelLoggingEnabled(strapi))) return '';
    if (!payload.updates.length) return '';
    ensureModuleLogDir(moduleName);
    const file = resolveModuleLogPath(moduleName, lead);

    const otherLines: string[] = [];
    let existingUpdates: Array<{
      timestamp: string;
      form: string;
      field: string;
      value: unknown;
    }> = [];

    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed) as {
            event?: string;
            form?: string;
            field?: string;
            value?: unknown;
            timestamp?: string;
            updates?: Array<{
              timestamp: string;
              form: string;
              field: string;
              value: unknown;
            }>;
          };
          if (obj.event === 'ADMIN_UPDATE') {
            if (Array.isArray(obj.updates)) {
              existingUpdates.push(...obj.updates);
            } else if (obj.form && obj.field) {
              existingUpdates.push({
                timestamp: obj.timestamp ?? payload.timestamp,
                form: obj.form,
                field: obj.field,
                value: obj.value,
              });
            }
            continue;
          }
          otherLines.push(trimmed);
        } catch {
          // drop legacy plain-text admin lines
        }
      }
    }

    const byKey = new Map<string, (typeof payload.updates)[number]>();
    for (const entry of existingUpdates) {
      if (entry.form && entry.field) {
        byKey.set(`${entry.form}|${entry.field}`, entry);
      }
    }
    for (const entry of payload.updates) {
      byKey.set(`${entry.form}|${entry.field}`, entry);
    }

    const mergedUpdates = [...byKey.values()].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    const adminLine = JSON.stringify({
      event: 'ADMIN_UPDATE',
      timestamp: payload.timestamp,
      leadId: payload.leadId,
      leadName: payload.leadName ?? null,
      loanApplicationId: payload.loanApplicationId ?? null,
      source: payload.source ?? 'admin',
      updates: mergedUpdates,
    });

    const merged = [...otherLines, adminLine];
    fs.writeFileSync(file, `${merged.join('\n')}\n`, 'utf8');
    return file;
  } catch {
    return '';
  }
}

/**
 * Delete code-level log files under `logs/` whose mtime is older than retentionDays.
 * Walks all module subdirs; never removes directories.
 */
export function purgeExpiredCodeLogs(retentionDays: number): {
  deleted: number;
  paths: string[];
} {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 30;
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const deletedPaths: string[] = [];

  if (!fs.existsSync(CODE_LOG_ROOT)) {
    return { deleted: 0, paths: [] };
  }

  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const stat = fs.statSync(full);
        if (stat.mtimeMs < cutoffMs) {
          fs.unlinkSync(full);
          deletedPaths.push(full);
        }
      } catch {
        // swallow per-file errors
      }
    }
  };

  walk(CODE_LOG_ROOT);
  return { deleted: deletedPaths.length, paths: deletedPaths };
}

/** Product folder under logs/: business-loan | personal-loan (default). */
export type LoanLogProduct = 'business-loan' | 'personal-loan';

export function isBusinessLoanType(
  loanType?: string | null
): boolean {
  return /business\s*loan/i.test(String(loanType ?? '').trim());
}

/**
 * Resolve product folder from loanType / selectedProduct (or similar).
 * Anything other than Business Loan → personal-loan.
 */
export function loanLogProduct(
  loanType?: string | null
): LoanLogProduct {
  return isBusinessLoanType(loanType) ? 'business-loan' : 'personal-loan';
}

/** Pick first non-empty string among candidates (loanType, selectedProduct, …). */
export function resolveLoanTypeHint(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return null;
}

/** Read a string field from a Strapi db.query row (camelCase or snake_case). */
export function readDbString(
  row: Record<string, unknown> | null | undefined,
  camel: string,
  snake?: string
): string | null {
  if (!row) return null;
  const snakeKey = snake ?? camel.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
  for (const key of [camel, snakeKey]) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/** Loan type from a loan-application db row. */
export function loanTypeFromLoanApp(
  app?: Record<string, unknown> | null
): string | null {
  return resolveLoanTypeHint(readDbString(app, 'loanType', 'loan_type') ?? undefined);
}

/** Product / loan type from a lead db row. */
export function loanTypeFromLead(
  lead?: Record<string, unknown> | null
): string | null {
  return resolveLoanTypeHint(
    readDbString(lead, 'selectedProduct', 'selected_product') ?? undefined,
    readDbString(lead, 'loanType', 'loan_type') ?? undefined,
    readDbString(lead, 'leadType', 'lead_type') ?? undefined
  );
}

export function eligibilityLogModule(loanType?: string | null): string {
  return loanLogProduct(loanType) === 'business-loan'
    ? 'business-loan/bl-eligibility'
    : 'personal-loan/pl-eligibility';
}

export function scoringLogModule(loanType?: string | null): string {
  return loanLogProduct(loanType) === 'business-loan'
    ? 'business-loan/bl-scoring'
    : 'personal-loan/pl-scoring';
}

export function submissionLogModule(loanType?: string | null): string {
  return loanLogProduct(loanType) === 'business-loan'
    ? 'business-loan/bl-lead-submission'
    : 'personal-loan/pl-lead-submission';
}

export function bureauLogModule(loanType?: string | null): string {
  return loanLogProduct(loanType) === 'business-loan'
    ? 'business-loan/bl-bureau-extraction'
    : 'personal-loan/pl-bureau-extraction';
}

/**
 * Resolve loan type / product for a lead from DB.
 * Precedence: explicit opt → lead.selectedProduct → loan-app loanType → default Personal Loan.
 */
export async function resolveLeadLoanTypeFromDb(
  strapi: any,
  leadId: number | string,
  opts?: { loanApplicationId?: number; loanType?: string | null }
): Promise<string> {
  const explicit = resolveLoanTypeHint(opts?.loanType ?? undefined);
  if (explicit) return explicit;

  const id = Number(leadId);
  if (!Number.isFinite(id)) return 'Personal Loan';
  if (!strapi?.db?.query) return 'Personal Loan';

  try {
    const lead = await strapi.db.query('api::lead.lead').findOne({
      where: { id },
    });
    const fromLead = loanTypeFromLead(lead);

    let app: Record<string, unknown> | null = null;
    if (opts?.loanApplicationId != null) {
      app = await strapi.db
        .query('api::loan-application.loan-application')
        .findOne({ where: { id: opts.loanApplicationId } });
    } else {
      const apps = await strapi.db
        .query('api::loan-application.loan-application')
        .findMany({
          where: { leadId: id },
          orderBy: { id: 'desc' },
          limit: 1,
        });
      app = apps?.[0] ?? null;
    }

    if (app && !loanAppBelongsToLead(app, id)) {
      app = null;
    }

    const fromApp = loanTypeFromLoanApp(app);

    if (fromLead && fromApp && fromLead !== fromApp) {
      strapi.log?.warn?.(
        `[LoanType] mismatch leadId=${id} lead.selectedProduct=${fromLead} loanApp.loanType=${fromApp}; using lead product for logs`
      );
    }

    if (fromLead) return fromLead;
    if (fromApp) return fromApp;
    return 'Personal Loan';
  } catch {
    return 'Personal Loan';
  }
}

/** Alias for log writers — resolves product folder from lead + loan app. */
export const resolveLoanTypeForLead = resolveLeadLoanTypeFromDb;

function loanAppBelongsToLead(
  app: Record<string, unknown>,
  leadId: number
): boolean {
  const appLeadId = readDbString(app, 'leadId', 'lead_id');
  if (!appLeadId) return false;
  return Number(appLeadId) === leadId;
}
