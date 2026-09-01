const DEDUPE_WINDOW_MS = 120_000;

type ActivityLogRow = {
  id?: number;
  action?: string;
  leadId?: number | string | null;
  correlationId?: string | null;
  createdAt?: string;
};

function readLeadId(log: ActivityLogRow): string {
  const value = log.leadId;
  if (value == null || value === '') return '';
  return String(value);
}

function dedupeKey(log: ActivityLogRow): string {
  const action = String(log.action ?? '');
  const leadId = readLeadId(log);
  const correlationId = log.correlationId ? String(log.correlationId) : '';

  if (correlationId) {
    return `${action}|${leadId}|${correlationId}`;
  }

  const createdAt = log.createdAt ? new Date(log.createdAt).getTime() : 0;
  const bucket = Math.floor(createdAt / DEDUPE_WINDOW_MS);
  return `${action}|${leadId}|${bucket}`;
}

/** Collapse duplicate bell rows (same action/lead/run) while preserving order. */
export function dedupeNotifications<T extends ActivityLogRow>(logs: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const log of logs) {
    const key = dedupeKey(log);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(log);
  }

  return out;
}
