import React from 'react';
import LoanApplicationForm from './LoanApplicationForm';
import './LoanApplication.css';

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
        <main className="loan-app-page">
            <div className="container">
                <header className="loan-app-header">
                    <h1 className="loan-app-title">
                        {pageTitle}
                    </h1>
                    <p className="loan-app-subtitle">
                        {pageSubtitle}
                    </p>
                </header>

                <LoanApplicationForm pageInfo={pageInfo} />
            </div>
        </main>
    );
}
