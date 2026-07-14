export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi } from '@/lib/strapi';
import './Lenders.css';

async function getLendersData() {
    try {
        const res = await fetch(strapiInternalApi('/api/lenders-catalogs?filters[isActive][$eq]=true&pagination[pageSize]=100'), {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    } catch (error) {
        // console.error("Fetch error lenders-catalogs:", error);
        return [];
    }
}

export default async function LendersPage() {
    const lendersResponse = await getLendersData();

    const title = 'Matched Lenders';
    const description = 'Based on your application, these lenders are the best match for your requirements.';

    const lenders = Array.isArray(lendersResponse) ? lendersResponse.map((l: any) => {
        const attr = l.attributes || l;
        return {
            id: l.id,
            name: attr.lenderName,
            type: attr.lenderType,
            code: attr.lenderCode,
            initials: attr.lenderName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        };
    }) : [];

    return (
        <main className="lenders-main">
            <div className="container lenders-container">
                <div className="lenders-header">
                    <h1 className="lenders-title">
                        {title} ({lenders.length})
                    </h1>
                    <p className="lenders-subtitle">
                        {description}
                    </p>
                </div>

                <div className="lenders-grid">
                    {lenders.length > 0 ? lenders.map((lender: any) => (
                        <div key={lender.id} className="lender-card">
                            <div className="lender-logo-container">
                                <span>{lender.initials}</span>
                            </div>
                            <h3 className="lender-name">{lender.name}</h3>
                            <p className="lender-rate">{lender.type}</p>
                            <p className="lender-code">{lender.code}</p>
                            <button type="button" className="btn btn-primary lender-apply-btn">
                                Apply Now
                            </button>
                        </div>
                    )) : (
                        <div className="lenders-empty">
                            No matched lenders found at the moment.
                        </div>
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
