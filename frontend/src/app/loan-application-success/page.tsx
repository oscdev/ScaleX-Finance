import React from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';

export default function LoanApplicationSuccess() {
    return (
        <main className="min-h-screen" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
            <div className="container animate-fade-in text-center">
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem' }}>
                    
                    {/* Success Icon Container */}
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        background: 'rgba(34, 197, 94, 0.2)', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 2rem auto',
                        border: '2px solid #22c55e'
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>

                    <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>
                        Application Received!
                    </h1>
                    
                    <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2.5rem', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
                        Thank you for applying with ScaleX Finance. Your loan application has been submitted successfully and is now being processed by our team.
                    </p>

                    <div className="rich-text" style={{ 
                        background: 'rgba(59, 130, 246, 0.05)', 
                        padding: '1.5rem', 
                        borderRadius: '1rem', 
                        border: '1px solid var(--border-color)',
                        textAlign: 'left',
                        marginBottom: '3rem'
                    }}>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Next Steps:</h4>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.95rem', opacity: 0.9 }}>
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

            {/* Background Gradient Orbs (Mimicking global style) */}
            <div style={{
                position: 'fixed',
                top: '20%',
                right: '10%',
                width: '300px',
                height: '300px',
                background: 'var(--primary)',
                filter: 'blur(150px)',
                opacity: 0.05,
                borderRadius: '50%',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>
            <div style={{
                position: 'fixed',
                bottom: '10%',
                left: '5%',
                width: '400px',
                height: '400px',
                background: 'var(--secondary)',
                filter: 'blur(180px)',
                opacity: 0.05,
                borderRadius: '50%',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>
        </main>
    );
}
