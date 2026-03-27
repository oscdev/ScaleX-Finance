import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';

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
        <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '4rem 0' }}>
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
                        {title} ({lenders.length})
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
                        {description}
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {lenders.length > 0 ? lenders.map((lender: any) => (
                        <div key={lender.id} className="card" style={{
                            padding: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    background: '#f3f4f6',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#3b82f6',
                                    overflow: 'hidden'
                                }}>
                                    {lender.logo ? (
                                        <img src={lender.logo} alt={lender.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <span>{lender.initials}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{lender.name}</h3>
                                    <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>{lender.interestRate}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    {lender.matchPercentage}% Match
                                </div>
                                <a href={lender.applyUrl} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}>
                                    Apply Now
                                </a>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            No matched lenders found at the moment.
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                        ← Back to Homepage
                    </Link>
                </div>
            </div>
        </main>
    );
}
