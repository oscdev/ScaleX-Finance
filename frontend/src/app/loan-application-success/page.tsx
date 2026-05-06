import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import './LoanApplicationSuccess.css';

export default function LoanApplicationSuccess() {
    return (
        <main className="success-page-main">
            <div className="container animate-fade-in text-center">
                <div className="card success-card">
                    
                    {/* Success Icon Container */}
                    <div className="success-icon-container">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="success-icon-svg">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>

                    <h1 className="hero-title success-title">
                        Application Received!
                    </h1>
                    
                    <p className="success-message">
                        Thank you for applying with ScaleX Finance. Your loan application has been submitted successfully and is now being processed by our team.
                    </p>

                    <div className="rich-text next-steps-container">
                        <h4 className="next-steps-title">Next Steps:</h4>
                        <ul className="next-steps-list">
                            <li>Our advisors will review your documents within 24 hours.</li>
                            <li>You will receive a call/email for verification.</li>
                            <li>Stay tuned to your dashboard for status updates.</li>
                        </ul>
                    </div>

                    <div className="btn-group">
                        <Link href="/" className="btn btn-primary">
                            Return to Homepage
                        </Link>
                        <Link href="/products" className="btn btn-secondary">
                            Explore Products
                        </Link>
                    </div>
                </div>
            </div>

            {/* Background Gradient Orbs */}
            <div className="background-orb orb-1"></div>
            <div className="background-orb orb-2"></div>
        </main>
    );
}
