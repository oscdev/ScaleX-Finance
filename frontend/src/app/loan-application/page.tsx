import React from 'react';
import LoanApplicationForm from './LoanApplicationForm';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Loan Application | Scalex Finance',
    description: 'Complete your loan application in 5 easy steps.',
};

import { strapiInternalApi } from '@/lib/strapi';

async function getLoanApplicationPageData() {
    try {
        const res = await fetch(strapiInternalApi('/api/loan-application-page?populate=*'), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch loan-application-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error:", error);
        return null;
    }
}

export default async function LoanApplicationPage() {
    const pageResponse = await getLoanApplicationPageData();

    // Handle Strapi v4 vs v5 attributes wrapper
    let pageInfo: any = {};
    if (pageResponse) {
        pageInfo = pageResponse.attributes || pageResponse;
    }

    const pageTitle = pageInfo.pageTitle || 'Loan Application';
    const pageSubtitle = pageInfo.pageSubtitle || 'Complete the steps below to submit your request.';

    return (
        <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '4rem 0' }}>
            <div className="container">
                <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
                        {pageTitle}
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1.25rem' }}>
                        {pageSubtitle}
                    </p>
                </header>

                <LoanApplicationForm pageInfo={pageInfo} />
            </div>
        </main>
    );
}
