import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { resolveUploadDir, runDimJob } from '../../dim-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeCsvFilename(raw: string): string | null {
  const base = path.basename(String(raw || '').replace(/\\/g, '/'));
  if (!base.toLowerCase().endsWith('.csv')) return null;
  if (!/^[a-zA-Z0-9._-]+\.csv$/i.test(base)) return null;
  return base;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const importerName = String(form.get('importer') || 'zipcodes').trim();
    const dryRun =
      String(form.get('dryRun') || '').toLowerCase() === 'true' ||
      form.get('dryRun') === '1';
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'CSV exceeds 10 MB limit' },
        { status: 400 }
      );
    }

    const safeName = sanitizeCsvFilename(file.name);
    if (!safeName) {
      return NextResponse.json(
        {
          error:
            'Invalid filename — use a simple .csv name (letters, digits, ._-)',
        },
        { status: 400 }
      );
    }

    const uploadDir = resolveUploadDir(importerName);
    fs.mkdirSync(uploadDir, { recursive: true });
    const destPath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    const args = [importerName, `--file=${safeName}`];
    if (dryRun) args.push('--dry-run');

    const result = await runDimJob(args);
    if (result.error && result.ok === false && !result.summaries) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: Boolean(result.ok),
      exitCode: result.exitCode ?? (result.ok ? 0 : 1),
      dryRun,
      filesProcessed: result.filesProcessed ?? 0,
      summaries: result.summaries ?? [],
      logBasename: result.logBasename,
      table: result.table,
      error: result.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
