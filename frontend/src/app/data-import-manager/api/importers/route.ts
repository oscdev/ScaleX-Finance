import { NextResponse } from 'next/server';
import { runDimJob } from '../../dim-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const listed = await runDimJob(['list']);
    const importersMeta = (listed.importers as Array<{
      name: string;
      label: string;
      datasetDir: string;
    }>) || [];

    const importers = [];
    for (const meta of importersMeta) {
      const detail = await runDimJob(['meta', meta.name]);
      importers.push({
        name: meta.name,
        label: meta.label,
        datasetDir: meta.datasetDir,
        table: detail.table,
        requiredHeaders: detail.requiredHeaders || [],
      });
    }

    return NextResponse.json({ importers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
