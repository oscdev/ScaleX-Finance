import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';
import './Lenders.css';

async function getLendersPageData() {
    try {
        const res = await fetch(strapiInternalApi('/api/lenders-page?populate=*'), {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error lenders-page:", error);
        return null;
    }
}

async function getLendersData() {
    try {
        const res = await fetch(strapiInternalApi('/api/lenders?populate=*'), {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    } catch (error) {
        // console.error("Fetch error lenders:", error);
        return [];
    }
}

export default async function LendersPage() {
    const pageResponse = await getLendersPageData();
    const lendersResponse = await getLendersData();

    let pageInfo: any = {};
    if (pageResponse) {
        pageInfo = pageResponse.attributes || pageResponse;
    }

    const title = pageInfo.title || 'Matched Lenders';
    const description = pageInfo.description || 'Based on your application, these lenders are the best match for your requirements.';

    const lenders = Array.isArray(lendersResponse) ? lendersResponse.map((l: any) => {
        const attr = l.attributes || l;
        const logoUrl = attr.logo?.data?.attributes?.url || attr.logo?.url;
        return {
            id: l.id,
            name: attr.name,
            interestRate: attr.interestRateOffer,
            matchPercentage: attr.matchPercentage,
            applyUrl: attr.applyUrl || '#',
            logo: logoUrl ? withStrapiPublicUrl(logoUrl) : null,
            initials: attr.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
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
                            <div className="lender-info">
                                <div className="lender-logo-container">
                                    {lender.logo ? (
                                        <img src={lender.logo} alt={lender.name} className="lender-logo-img" />
                                    ) : (
                                        <span>{lender.initials}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="lender-name">{lender.name}</h3>
                                    <p className="lender-rate">{lender.interestRate}</p>
                                </div>
                            </div>
                            <div className="lender-match">
                                <div className="match-percentage">
                                    {lender.matchPercentage}% Match
                                </div>
                                <a href={lender.applyUrl} className="btn btn-primary">
                                    Apply Now
                                </a>
                            </div>
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
