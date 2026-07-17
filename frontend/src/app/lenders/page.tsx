export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi } from '@/lib/strapi';
import './Lenders.css';

type MatchedLender = {
    id?: number | string;
    name: string;
    type?: string;
    code: string;
    initials: string;
};

async function getMatchedLenders(
    leadId: string,
    source?: string
): Promise<{
    lenders: MatchedLender[];
    error?: string;
}> {
    try {
        const qs = new URLSearchParams({ leadId });
        if (source) qs.set('source', source);
        const res = await fetch(
            strapiInternalApi(
                `/api/personal-loan-eligibility/matched-lenders?${qs.toString()}`
            ),
            {
                cache: 'no-store',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = json?.error?.message || json?.error?.code || `Match failed (${res.status})`;
            return { lenders: [], error: String(msg) };
        }
        const list = Array.isArray(json.lenders) ? json.lenders : [];
        return {
            lenders: list.map((l: any, idx: number) => {
                const name = l.lenderName || l.name || l.lenderCode || 'Lender';
                return {
                    id: l.lenderCode || idx,
                    name,
                    type: l.lenderType || l.type,
                    code: l.lenderCode || l.code || '',
                    initials: String(name)
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase(),
                };
            }),
        };
    } catch {
        return { lenders: [], error: 'Unable to load matched lenders' };
    }
}

export default async function LendersPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
    const sp = (await Promise.resolve(searchParams)) || {};
    const raw = sp.leadId;
    const leadId = Array.isArray(raw) ? raw[0] : raw;
    const rawSource = sp.source;
    const source = Array.isArray(rawSource) ? rawSource[0] : rawSource;

    const title = 'Matched Lenders';
    let description =
        'Based on your application, these lenders are the best match for your requirements.';
    let lenders: MatchedLender[] = [];
    let emptyMessage = 'Open AI Match from a lead to see eligible lenders.';

    if (leadId) {
        description = `Lenders that passed eligibility checks for lead #${leadId}.`;
        const result = await getMatchedLenders(String(leadId), source ? String(source) : undefined);
        lenders = result.lenders;
        emptyMessage = result.error
            ? result.error
            : 'No matched lenders found at the moment.';
    }

    return (
        <main className="lenders-main">
            <div className="container lenders-container">
                <div className="lenders-header">
                    <h1 className="lenders-title">
                        {title} ({lenders.length})
                    </h1>
                    <p className="lenders-subtitle">{description}</p>
                </div>

                <div className="lenders-grid">
                    {lenders.length > 0 ? (
                        lenders.map((lender) => (
                            <div key={String(lender.id)} className="lender-card">
                                <div className="lender-logo-container">
                                    <span>{lender.initials}</span>
                                </div>
                                <h3 className="lender-name">{lender.name}</h3>
                                {lender.type ? <p className="lender-rate">{lender.type}</p> : null}
                                <p className="lender-code">{lender.code}</p>
                                <button type="button" className="btn btn-primary lender-apply-btn">
                                    Apply Now
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="lenders-empty">{emptyMessage}</div>
                    )}
                </div>

                <div className="lenders-footer">
                    <Link href="/" className="back-link">
                        ← Back to Homepage
                    </Link>
                </div>
            </div>
        </main>
    );
}
