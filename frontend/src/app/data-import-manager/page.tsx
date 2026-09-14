'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
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

export default function DataImportManagerPage() {
  const [importers, setImporters] = useState<ImporterInfo[]>([]);
  const [importer, setImporter] = useState('zipcodes');
  const [dryRun, setDryRun] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [logText, setLogText] = useState('');

  const refreshLogs = useCallback(async (importerName: string) => {
    const res = await fetch(
      `/data-import-manager/api/logs?importer=${encodeURIComponent(importerName)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load logs');
    setLogs(data.logs || []);
  }, []);

  const openLog = useCallback(
    async (name: string, importerName: string) => {
      setActiveLog(name);
      const res = await fetch(
        `/data-import-manager/api/logs/${encodeURIComponent(name)}?importer=${encodeURIComponent(importerName)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLogText(data.error || 'Failed to load log');
        return;
      }
      setLogText(await res.text());
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data-import-manager/api/importers');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load importers');
        if (cancelled) return;
        const list: ImporterInfo[] = data.importers || [];
        setImporters(list);
        const first = list[0]?.name || 'zipcodes';
        setImporter(first);
        await refreshLogs(first);
      } catch (err) {
        if (!cancelled) {
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
      setStatus('Choose a CSV file first.');
      return;
    }
    setBusy(true);
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
      });
      const data: ImportResult = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      const s = data.summaries?.[0];
      setStatus(
        data.ok
          ? `Done${data.dryRun ? ' (dry run)' : ''} — inserted ${s?.inserted ?? 0}, updated ${s?.updated ?? 0}, rejected ${s?.rejected ?? 0}`
          : `Finished with errors — see log`
      );
      await refreshLogs(importer);
      if (data.logBasename) {
        await openLog(data.logBasename, importer);
      }
    } catch (err) {
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
                  void refreshLogs(v);
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

          {status && <p className="dim-status">{status}</p>}
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
              onClick={() => void refreshLogs(importer)}
            >
              Refresh
            </button>
          </div>
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
