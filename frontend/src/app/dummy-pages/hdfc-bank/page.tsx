import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';
import '../DummyPages.css';

async function getHdfcBankPageData() {
    try {
        const res = await fetch(strapiInternalApi(`/api/hdfc-bank-page?populate=*&timestamp=${Date.now()}`), {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error hdfc-bank-page:", error);
        return null;
    }
}

export default async function HdfcBankPage() {
    const pageResponse = await getHdfcBankPageData();
    let pageInfo: any = {};
    if (pageResponse) {
        // Handle Strapi v4 (attributes) and v5 (flat)
        pageInfo = pageResponse.attributes || pageResponse;
    }

    const heroTitle = pageInfo?.heroTitle || 'HDFC Bank Portal';
    const heroSubtitle = pageInfo?.heroSubtitle || 'Trusted financial partner for your loan requirements.';
    const applyButtonText = pageInfo?.applyButtonText || 'Apply Now via HDFC';
    const backToLendersText = pageInfo?.backToLendersText || 'Return to Lenders List';
    const logoUrl = pageInfo?.bankLogo?.data?.attributes?.url || pageInfo?.bankLogo?.url;

    return (
        <main className="dummy-page-main">
            <div className="container dummy-container">
                <div className="card dummy-card animate-fade-in">
                    <div className="dummy-logo-container">
                        {logoUrl ? (
                            <img src={withStrapiPublicUrl(logoUrl)} alt="HDFC Bank" className="dummy-logo-img" />
                        ) : (
                            <div className="dummy-logo-fallback">💸</div>
                        )}
                    </div>

                    <h1 className="dummy-title">
                        {heroTitle}
                    </h1>

                    <p className="dummy-subtitle">
                        {heroSubtitle}
                    </p>

                    <div className="dummy-actions">
                        <button className="btn btn-primary dummy-submit-btn">
                            {applyButtonText}
                        </button>

                        <Link href="/lenders" className="dummy-back-link">
                            ← {backToLendersText}
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
