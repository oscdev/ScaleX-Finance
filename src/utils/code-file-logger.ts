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
 * Resolve loan type / product for a lead from DB (loan app preferred, then lead.selectedProduct).
 * Used when Content API lead.find is not public (AI Match / lenders page).
 */
export async function resolveLeadLoanTypeFromDb(
  strapi: any,
  leadId: number | string
): Promise<string | null> {
  const id = Number(leadId);
  if (!Number.isFinite(id)) return null;
  if (!strapi?.db?.query) return null;

  try {
    const apps = await strapi.db
      .query('api::loan-application.loan-application')
      .findMany({
        where: { leadId: id },
        orderBy: { id: 'desc' },
        limit: 1,
      });
    const fromApp = resolveLoanTypeHint(apps?.[0]?.loanType);
    if (fromApp) return fromApp;

    const lead = await strapi.db.query('api::lead.lead').findOne({
      where: { id },
    });
    return resolveLoanTypeHint(lead?.selectedProduct, lead?.loanType);
  } catch {
    return null;
  }
}
