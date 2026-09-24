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

/** Newest-first: one row per action+lead (or action+id when no lead). */
function dedupeKey(log: ActivityLogRow): string {
  const action = String(log.action ?? '');
  const leadId = readLeadId(log);
  if (leadId) return `${action}|${leadId}`;
  return `${action}|id:${log.id ?? ''}`;
}

/** Collapse duplicate bell rows (same action/lead) while preserving newest-first order. */
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
