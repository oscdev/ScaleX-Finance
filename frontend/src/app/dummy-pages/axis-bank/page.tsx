import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';

async function getAxisBankPageData() {
    try {
        const res = await fetch(strapiInternalApi(`/api/axis-bank-page?populate=*&timestamp=${Date.now()}`), {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error axis-bank-page:", error);
        return null;
    }
}

export default async function AxisBankPage() {
    const pageResponse = await getAxisBankPageData();
    let pageInfo: any = {};
    if (pageResponse) {
        // Handle Strapi v4 (attributes) and v5 (flat)
        pageInfo = pageResponse.attributes || pageResponse;
    }

    const heroTitle = pageInfo?.heroTitle || 'Welcome to Axis Bank';
    const heroSubtitle = pageInfo?.heroSubtitle || 'Your preferred lender choice for financial solutions.';
    const applyButtonText = pageInfo?.applyButtonText || 'Proceed with Application';
    const backToLendersText = pageInfo?.backToLendersText || 'Back to Lenders';
    const logoUrl = pageInfo?.bankLogo?.data?.attributes?.url || pageInfo?.bankLogo?.url;

    return (
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '4rem 0' }}>
            <div className="container" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div className="card animate-fade-in" style={{ padding: '3rem', background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        {logoUrl ? (
                            <img src={withStrapiPublicUrl(logoUrl)} alt="Axis Bank" style={{ height: '60px', margin: '0 auto' }} />
                        ) : (
                            <div style={{ fontSize: '3rem' }}>🏦</div>
                        )}
                    </div>

                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
                        {heroTitle}
                    </h1>

                    <p style={{ color: '#4b5563', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                        {heroSubtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                            {applyButtonText}
                        </button>

                        <Link href="/lenders" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: 500, marginTop: '1rem' }}>
                            ← {backToLendersText}
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
