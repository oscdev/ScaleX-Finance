export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi } from '@/lib/strapi';
import './Lenders.css';

type MatchedLender = {
    id?: number | string;
    name: string;
    type?: string;
    code: string;
    score?: number | null;
    rank?: number | null;
};

function formatMatchScore(score: number): string {
    return String(Math.round(score));
}

async function resolveLeadProduct(leadId: string): Promise<string> {
    try {
        // Public Content API cannot read leads (no find permission). Use auth:false
        // loan-type helper that resolves from DB (loan app loanType → lead.selectedProduct).
        const res = await fetch(
            strapiInternalApi(
                `/api/personal-loan-eligibility/loan-type?leadId=${encodeURIComponent(leadId)}`
            ),
            { cache: 'no-store' }
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.loanType) return String(json.loanType);
        return 'Personal Loan';
    } catch {
        return 'Personal Loan';
    }
}

function matchApiPath(product: string): string {
    return /business\s*loan/i.test(product)
        ? '/api/business-loan-eligibility/matched-lenders'
        : '/api/personal-loan-eligibility/matched-lenders';
}

async function getMatchedLenders(
    leadId: string,
    source?: string
): Promise<{
    lenders: MatchedLender[];
    error?: string;
    product?: string;
}> {
    try {
        const product = await resolveLeadProduct(leadId);
        const qs = new URLSearchParams({ leadId });
        if (source) qs.set('source', source);
        const res = await fetch(
            strapiInternalApi(`${matchApiPath(product)}?${qs.toString()}`),
            {
                cache: 'no-store',
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = json?.error?.message || json?.error?.code || `Match failed (${res.status})`;
            return { lenders: [], error: String(msg), product };
        }
        const list = Array.isArray(json.lenders) ? json.lenders : [];
        return {
            product,
            lenders: list.map((l: any, idx: number) => {
                const name = l.lenderName || l.name || l.lenderCode || 'Lender';
                return {
                    id: l.lenderCode || idx,
                    name,
                    type: l.lenderType || l.type,
                    code: l.lenderCode || l.code || '',
                    score: l.score ?? null,
                    rank: l.rank ?? null,
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
                                <div className="lender-logo-container" title={lender.code}>
                                    <span className="lender-code-badge">{lender.code}</span>
                                </div>
                                <h3 className="lender-name">{lender.name}</h3>
                                {lender.rank != null ? (
                                    <p className="lender-rate">Rank #{lender.rank}</p>
                                ) : null}
                                {lender.score != null ? (
                                    <p className="lender-match-score">
                                        Match score:{' '}
                                        <strong>{formatMatchScore(lender.score)}</strong>
                                    </p>
                                ) : null}
                                {lender.type ? <p className="lender-rate">{lender.type}</p> : null}
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
