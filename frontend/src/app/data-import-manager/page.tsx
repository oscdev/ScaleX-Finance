'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import './data-import-manager.css';

type ImporterInfo = {
  name: string;
  label: string;
  datasetDir: string;
  table: string;
  requiredHeaders: string[];
};

type LogEntry = {
  name: string;
  size: number;
  mtimeMs: number;
  errorsCsv: string | null;
};

type ImportResult = {
  ok: boolean;
  dryRun?: boolean;
  filesProcessed?: number;
  summaries?: Array<{
    file: string;
    inserted?: number;
    updated?: number;
    rejected?: number;
    valid?: number;
  }>;
  logBasename?: string;
  error?: string;
};

async function readJsonResponse<T extends { error?: string }>(
  res: Response,
  fallbackError: string
): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? `${fallbackError} (expected JSON, got ${contentType || 'non-JSON'})`
        : `${fallbackError} (HTTP ${res.status})`
    );
  }
  return (await res.json()) as T;
}

function formatImportStatus(data: ImportResult): string {
  const summaries = data.summaries || [];
  const hasSummary = summaries.length > 0;
  const inserted = summaries.reduce((n, s) => n + (s.inserted ?? 0), 0);
  const updated = summaries.reduce((n, s) => n + (s.updated ?? 0), 0);
  const rejected = summaries.reduce((n, s) => n + (s.rejected ?? 0), 0);
  const counts = `inserted ${inserted}, updated ${updated}, rejected ${rejected}`;
  if (!data.ok) {
    return hasSummary
      ? `Finished with errors — ${counts}`
      : 'Finished with errors — see log';
  }
  if (!hasSummary) {
    return `Done${data.dryRun ? ' (dry run)' : ''} — see log for counts`;
  }
  return `Done${data.dryRun ? ' (dry run)' : ''} — ${counts}`;
}

export default function DataImportManagerPage() {
  const [importers, setImporters] = useState<ImporterInfo[]>([]);
  const [importer, setImporter] = useState('zipcodes');
  const [dryRun, setDryRun] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [statusKind, setStatusKind] = useState<'info' | 'ok' | 'error'>('info');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [logText, setLogText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [logsMessage, setLogsMessage] = useState('');
  const activeLogRef = useRef<string | null>(null);

  useEffect(() => {
    activeLogRef.current = activeLog;
  }, [activeLog]);

  const openLog = useCallback(
    async (name: string, importerName: string) => {
      setActiveLog(name);
      activeLogRef.current = name;
      const res = await fetch(
        `/data-import-manager/api/logs/${encodeURIComponent(name)}?importer=${encodeURIComponent(importerName)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setLogText(data.error || 'Failed to load log');
        } else {
          setLogText(`Failed to load log (HTTP ${res.status})`);
        }
        return;
      }
      setLogText(await res.text());
    },
    []
  );

  const fetchLogList = useCallback(async (importerName: string) => {
    const res = await fetch(
      `/data-import-manager/api/logs?importer=${encodeURIComponent(importerName)}`,
      { cache: 'no-store' }
    );
    const data = await readJsonResponse<{ logs?: LogEntry[]; error?: string }>(
      res,
      'Failed to load logs'
    );
    if (!res.ok) throw new Error(data.error || 'Failed to load logs');
    const list = data.logs || [];
    setLogs(list);
    return list;
  }, []);

  const refreshLogs = useCallback(
    async (
      importerName: string,
      opts?: { reopenActive?: boolean; openNewest?: boolean }
    ) => {
      const list = await fetchLogList(importerName);
      const current = activeLogRef.current;
      if (opts?.reopenActive && current) {
        const stillThere = list.some((l) => l.name === current);
        if (stillThere) {
          await openLog(current, importerName);
          return list;
        }
      }
      if (opts?.openNewest && list[0]) {
        await openLog(list[0].name, importerName);
      }
      return list;
    },
    [fetchLogList, openLog]
  );

  const onRefreshClick = useCallback(async () => {
    setRefreshing(true);
    setLogsMessage('');
    try {
      await refreshLogs(importer, {
        reopenActive: true,
        openNewest: !activeLogRef.current,
      });
      setLogsMessage('Log list updated.');
    } catch (err) {
      setLogsMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [importer, refreshLogs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data-import-manager/api/importers', {
          cache: 'no-store',
        });
        const data = await readJsonResponse<{
          importers?: ImporterInfo[];
          error?: string;
        }>(res, 'Failed to load importers');
        if (!res.ok) throw new Error(data.error || 'Failed to load importers');
        if (cancelled) return;
        const list: ImporterInfo[] = data.importers || [];
        setImporters(list);
        const first = list[0]?.name || 'zipcodes';
        setImporter(first);
        await refreshLogs(first, { openNewest: true });
      } catch (err) {
        if (!cancelled) {
          setStatusKind('error');
          setStatus(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLogs]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatusKind('error');
      setStatus('Choose a CSV file first.');
      return;
    }
    setBusy(true);
    setStatusKind('info');
    setStatus('Importing…');
    setResult(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('importer', importer);
      form.set('dryRun', dryRun ? 'true' : 'false');
      const res = await fetch('/data-import-manager/api/import', {
        method: 'POST',
        body: form,
        cache: 'no-store',
      });
      const data = await readJsonResponse<ImportResult>(res, 'Import failed');
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      setStatusKind(data.ok ? 'ok' : 'error');
      setStatus(formatImportStatus(data));
      await refreshLogs(importer);
      if (data.logBasename) {
        await openLog(data.logBasename, importer);
      }
    } catch (err) {
      setStatusKind('error');
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const selected = importers.find((i) => i.name === importer);

  return (
    <div className="dim-page">
      <header className="dim-header">
        <h1>Data Import Manager</h1>
        <p>
          Upload a CSV to upsert master data. Runs on this site path — no extra
          port. Logs are human-readable.
        </p>
      </header>

      <div className="dim-grid">
        <section className="dim-panel">
          <h2>Import</h2>
          <form className="dim-form" onSubmit={onSubmit}>
            <label>
              Dataset
              <select
                value={importer}
                onChange={(e) => {
                  const v = e.target.value;
                  setImporter(v);
                  setActiveLog(null);
                  setLogText('');
                  setLogsMessage('');
                  void refreshLogs(v, { openNewest: true }).catch((err) => {
                    setStatusKind('error');
                    setStatus(err instanceof Error ? err.message : String(err));
                  });
                }}
              >
                {importers.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <p className="dim-meta">
                Table <code>{selected.table}</code> · folder{' '}
                <code>{selected.datasetDir}</code>
                <br />
                Required columns:{' '}
                <code>{selected.requiredHeaders.join(', ')}</code>
              </p>
            )}

            <label>
              CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <label className="dim-check">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry run (validate only — no DB writes, file stays in upload/)
            </label>

            <button type="submit" disabled={busy}>
              {busy ? 'Working…' : dryRun ? 'Validate CSV' : 'Import CSV'}
            </button>
          </form>

          {status && (
            <p className={`dim-status dim-status-${statusKind}`}>{status}</p>
          )}
          {result?.summaries && result.summaries.length > 0 && (
            <ul className="dim-summary">
              {result.summaries.map((s) => (
                <li key={s.file}>
                  <strong>{s.file}</strong> — valid {s.valid ?? '—'}, inserted{' '}
                  {s.inserted ?? 0}, updated {s.updated ?? 0}, rejected{' '}
                  {s.rejected ?? 0}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dim-panel">
          <div className="dim-logs-head">
            <h2>Logs</h2>
            <button
              type="button"
              className="dim-secondary"
              title="Reload log list"
              aria-label="Reload log list"
              disabled={refreshing}
              onClick={() => void onRefreshClick()}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {logsMessage && <p className="dim-logs-msg">{logsMessage}</p>}
          <ul className="dim-log-list">
            {logs.length === 0 && <li className="dim-empty">No logs yet.</li>}
            {logs.map((log) => (
              <li key={log.name}>
                <button
                  type="button"
                  className={
                    activeLog === log.name ? 'dim-log-item active' : 'dim-log-item'
                  }
                  onClick={() => void openLog(log.name, importer)}
                >
                  {log.name}
                </button>
                {log.errorsCsv && (
                  <a
                    className="dim-errors-link"
                    href={`/data-import-manager/api/logs/${encodeURIComponent(log.errorsCsv)}?importer=${encodeURIComponent(importer)}&download=1`}
                  >
                    errors CSV
                  </a>
                )}
              </li>
            ))}
          </ul>
          <pre className="dim-log-view">{logText || 'Select a log to view.'}</pre>
        </section>
      </div>
    </div>
  );
}
